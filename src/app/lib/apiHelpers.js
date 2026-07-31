import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "./security";
import dbConnect from "./db";
import User from "../models/userSchema";
import crypto from "node:crypto";

const authBuckets = new Map();
const WORKSPACE_USER_EMAIL = "workspace@inventory.local";

async function getDefaultWorkspaceAuth() {
  await dbConnect();

  const existingUser = await User.findOne({ isActive: true }).sort({ createdAt: 1 }).lean();
  if (existingUser) {
    return {
      userId: String(existingUser._id),
      role: "owner",
    };
  }

  const guestUser = await User.findOneAndUpdate(
    { email: WORKSPACE_USER_EMAIL },
    {
      $setOnInsert: {
        name: "Inventory User",
        email: WORKSPACE_USER_EMAIL,
        passwordHash: crypto.randomBytes(32).toString("hex"),
        role: "owner",
        isActive: true,
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  return {
    userId: String(guestUser._id),
    role: "owner",
  };
}

export class HttpError extends Error {
  constructor(message, status = 400, errors = null) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.errors = errors;
  }
}

export async function parseJsonBody(request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const text = await request.text();
      if (!text) {
        return {};
      }

      try {
        return JSON.parse(text);
      } catch {
        throw new HttpError("Invalid JSON payload", 400);
      }
    }

    const url = new URL(request.url);
    return Object.fromEntries(url.searchParams.entries());
  } catch {
    throw new HttpError("Invalid JSON payload", 400);
  }
}

export async function assertAuth(request, { roles = null } = {}) {
  const auth = await getAuthenticatedUser(request);
  if (!auth?.userId) {
    const fallbackAuth = await getDefaultWorkspaceAuth();
    if (roles && !roles.includes(fallbackAuth.role)) {
      throw new HttpError("Forbidden", 403);
    }

    return fallbackAuth;
  }

  if (roles && !roles.includes(auth.role)) {
    throw new HttpError("Forbidden", 403);
  }

  return auth;
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

export function rateLimit(key, { limit = 10, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const bucket = authBuckets.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }

  bucket.count += 1;
  authBuckets.set(key, bucket);

  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
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
