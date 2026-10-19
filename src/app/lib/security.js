// Authentication helpers for password hashing, persistent sessions, and secure auth cookies.
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import dbConnect from "./db";
import AuthSession from "../models/authSessionSchema";
import { AUTH_COOKIE_NAME } from "./authConstants";

export { AUTH_COOKIE_NAME };

export const DEFAULT_SESSION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

// JWT signing secrets are used only to validate older cookies during migration.
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be configured as a random server-only secret of at least 32 characters");
  }
  return secret;
}

function normalizeSessionDays(value = DEFAULT_SESSION_DAYS) {
  const days = Number(value);
  return Number.isInteger(days) ? Math.min(DEFAULT_SESSION_DAYS, Math.max(1, days)) : DEFAULT_SESSION_DAYS;
}

function hashSessionId(sessionId) {
  return crypto.createHash("sha256").update(String(sessionId)).digest("hex");
}

// Hashes a plain-text password before it is saved.
export function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

// Compares a plain password against a stored bcrypt hash.
export function comparePassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

// Legacy JWT helper retained so already-issued JWT cookies can be verified during migration.
export function signToken(payload, expiresInDays = DEFAULT_SESSION_DAYS) {
  const days = normalizeSessionDays(expiresInDays);
  return jwt.sign(payload, getJwtSecret(), { expiresIn: `${days}d` });
}

export function verifyToken(token) {
  if (!token) return null;
  const secret = getJwtSecret();

  try {
    return jwt.verify(token, secret, { algorithms: ["HS256"] });
  } catch {
    return null;
  }
}

// Create a cryptographically random opaque session ID. Its hash, never the raw ID,
// is persisted server-side; the raw value is delivered only in an HttpOnly cookie.
export async function createAuthSession(user, expiresInDays = DEFAULT_SESSION_DAYS) {
  if (!user?._id && !user?.id) throw new Error("A user is required to create an authentication session.");

  const days = normalizeSessionDays(expiresInDays);
  const sessionId = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + days * DAY_MS);

  await dbConnect();
  await AuthSession.create({
    userId: user._id || user.id,
    tokenHash: hashSessionId(sessionId),
    tokenVersion: Number(user.tokenVersion || 0),
    expiresAt,
  });

  return { sessionId, tokenDays: days, expiresAt };
}

// Reads the auth session ID from the incoming request cookie.
export function readTokenFromRequest(request) {
  return request.cookies?.get(AUTH_COOKIE_NAME)?.value || null;
}

// Reads the auth session ID from the server-side cookie store.
export async function readTokenFromCookieStore() {
  return (await cookies()).get(AUTH_COOKIE_NAME)?.value || null;
}

// Store an opaque session ID in an HttpOnly cookie so it survives browser restarts.
export function applyAuthCookie(response, sessionId, expiresInDays = DEFAULT_SESSION_DAYS) {
  const days = normalizeSessionDays(expiresInDays);
  response.cookies.set(AUTH_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: days * 24 * 60 * 60,
  });
  return response;
}

// Validates either an opaque server-side session or an older signed JWT cookie.
// Accepting older JWTs lets the next /api/auth/me check transparently upgrade them.
export async function getAuthenticatedUser(request) {
  const credential = readTokenFromRequest(request);
  if (!credential) return null;

  if (credential.split(".").length === 3) {
    const payload = verifyToken(credential);
    if (!payload?.sub) return null;

    return {
      userId: payload.userId || payload.sub,
      role: payload.role || "owner",
      payload,
      isLegacyToken: true,
    };
  }

  await dbConnect();
  const session = await AuthSession.findOne({
    tokenHash: hashSessionId(credential),
    expiresAt: { $gt: new Date() },
  }).lean();

  if (!session?.userId) return null;

  const userId = String(session.userId);
  return {
    userId,
    role: "owner",
    payload: {
      sub: userId,
      userId,
      tokenVersion: Number(session.tokenVersion || 0),
    },
    isLegacyToken: false,
    sessionRecordId: String(session._id),
  };
}

// Revoke one server-side session on logout. Legacy JWTs remain accepted only
// until their own expiry or a password change increments tokenVersion.
export async function revokeAuthSessionFromRequest(request) {
  const credential = readTokenFromRequest(request);
  if (!credential || credential.split(".").length === 3) return;

  await dbConnect();
  await AuthSession.deleteOne({ tokenHash: hashSessionId(credential) });
}

// Clears the auth cookie during logout.
export function clearAuthCookie(response) {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

// Creates the payload used by legacy signed JWTs.
export function createAuthPayload(user) {
  return {
    sub: String(user._id || user.id),
    userId: String(user.userId || user._id || user.id),
    role: user.role,
    email: user.email,
    tokenVersion: Number(user.tokenVersion || 0),
  };
}

// Checks whether an auth object has one of the allowed roles.
export function hasRole(auth, roles = []) {
  if (!auth) return false;
  if (!roles.length) return true;
  return roles.includes(auth.role);
}
