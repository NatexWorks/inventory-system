import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "./security";
import dbConnect from "./db";
import User from "../models/userSchema";
import RateLimit from "../models/rateLimitSchema";

export class HttpError extends Error {
  constructor(message, status = 400, errors = null) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.errors = errors;
  }
}

async function readBoundedRequestBody(request, maxBytes = 64 * 1024) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > maxBytes) {
    throw new HttpError("Request body is too large.", 413);
  }
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new HttpError("Request body is too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(combined);
}

export async function parseJsonBody(request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const text = await readBoundedRequestBody(request);
      if (!text) return {};

      try {
        return JSON.parse(text);
      } catch {
        throw new HttpError("Invalid JSON payload", 400);
      }
    }

    const url = new URL(request.url);
    if (url.search.length > 64 * 1024) {
      throw new HttpError("Request payload is too large.", 413);
    }
    return Object.fromEntries(url.searchParams.entries());
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError("Invalid JSON payload", 400);
  }
}

function assertSameOriginMutation(request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const origin = request.headers.get("origin");
  if (!origin) return;

  const requestUrl = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || requestUrl.protocol.slice(0, -1);
  const expectedOrigin = host ? `${proto.split(",")[0].trim()}://${host.split(",")[0].trim()}` : requestUrl.origin;

  let providedOrigin;
  try {
    providedOrigin = new URL(origin).origin;
  } catch {
    throw new HttpError("Cross-origin request blocked.", 403);
  }
  if (providedOrigin !== expectedOrigin) {
    throw new HttpError("Cross-origin request blocked.", 403);
  }
}

export async function assertAuth(request, { roles = null } = {}) {
  assertSameOriginMutation(request);
  const auth = await getAuthenticatedUser(request);
  if (!auth?.userId) {
    throw new HttpError("Unauthorized", 401);
  }

  // Resolve the live account on every protected request so disabled accounts,
  // changed roles, and revoked sessions cannot reuse an old JWT.
  await dbConnect();
  const user = await User.findById(auth.userId)
    .select("role isActive isDemo tokenVersion")
    .lean();

  if (!user || user.isActive === false) {
    throw new HttpError("Unauthorized", 401);
  }

  if (Number(auth.payload?.tokenVersion || 0) !== Number(user.tokenVersion || 0)) {
    throw new HttpError("Your session has expired. Please sign in again.", 401);
  }

  // The public demo account is deliberately read-only. This server-side check
  // protects every authenticated write API, even when a UI control is bypassed.
  if (user.isDemo && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    throw new HttpError("The demo account is read-only. Create an account to make changes.", 403);
  }

  const currentAuth = {
    ...auth,
    role: user.role,
    isDemo: Boolean(user.isDemo),
  };
  if (roles && !roles.includes(currentAuth.role)) {
    throw new HttpError("Forbidden", 403);
  }

  return currentAuth;
}

export async function assertOwner(request) {
  return assertAuth(request, { roles: ["owner"] });
}

export function parsePagination(request, defaults = { page: 1, limit: 10 }) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || defaults.page || 1);
  const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit")) || defaults.limit || 10));
  const search = String(searchParams.get("search") || "").trim();

  return { page, limit, search };
}

export function sanitizeSearch(value) {
  const escaped = String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return escaped.trim();
}

// MongoDB-backed fixed-window throttling survives serverless cold starts and
// multiple instances. Keys are hashed so raw emails and IP addresses are not stored.
let rateLimitIndexesReady;

async function ensureRateLimitIndexes() {
  if (!rateLimitIndexesReady) {
    rateLimitIndexesReady = RateLimit.init().catch((error) => {
      rateLimitIndexesReady = null;
      throw error;
    });
  }
  await rateLimitIndexesReady;
}

export async function rateLimit(key, { limit = 10, windowMs = 60_000 } = {}) {
  await dbConnect();
  await ensureRateLimitIndexes();

  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  const keyHash = crypto.createHash("sha256").update(String(key)).digest("hex");

  // Increment an active bucket in one atomic operation.
  let bucket = await RateLimit.findOneAndUpdate(
    { key: keyHash, expiresAt: { $gt: now } },
    { $inc: { count: 1 } },
    { returnDocument: "after" }
  ).lean();

  // Atomically recycle an expired bucket if one exists.
  if (!bucket) {
    bucket = await RateLimit.findOneAndUpdate(
      { key: keyHash, expiresAt: { $lte: now } },
      { $set: { count: 1, expiresAt: resetAt } },
      { returnDocument: "after" }
    ).lean();
  }

  // No bucket exists yet. Concurrent first requests can race on the unique key;
  // the loser then increments the active bucket.
  if (!bucket) {
    try {
      const created = await RateLimit.create({
        key: keyHash,
        count: 1,
        expiresAt: resetAt,
      });
      bucket = created.toObject();
    } catch (error) {
      if (error?.code !== 11000) throw error;

      const retryNow = new Date();
      bucket = await RateLimit.findOneAndUpdate(
        { key: keyHash, expiresAt: { $gt: retryNow } },
        { $inc: { count: 1 } },
        { returnDocument: "after" }
      ).lean();

      if (!bucket) {
        const nextResetAt = new Date(Date.now() + windowMs);
        bucket = await RateLimit.findOneAndUpdate(
          { key: keyHash, expiresAt: { $lte: new Date() } },
          { $set: { count: 1, expiresAt: nextResetAt } },
          { returnDocument: "after" }
        ).lean();
      }

      if (!bucket) throw error;
    }
  }

  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.expiresAt,
  };
}

// On Vercel, the platform appends the connecting client address to the forwarded
// chain. Use the last entry rather than a caller-supplied first entry.
export function getClientIp(request) {
  const values = (request.headers.get("x-forwarded-for") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return values.at(-1) || "unknown";
}

export function jsonError(message, status = 400, errors = null) {
  return NextResponse.json(
    {
      success: false,
      message,
      errors,
    },
    { status }
  );
}

export function buildMeta({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
