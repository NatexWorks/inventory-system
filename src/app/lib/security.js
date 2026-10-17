// Authentication helpers for password hashing, JWTs, and auth cookies.
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "./authConstants";

export { AUTH_COOKIE_NAME };

// JWT signing secrets must remain server-only and be configured explicitly.
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be configured as a random server-only secret of at least 32 characters");
  }
  return secret;
}

// Hashes a plain-text password before it is saved.
export function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

// Compares a plain password against a stored bcrypt hash.
export function comparePassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

// Signs the auth payload using the account-specific token lifetime (1–30 days).
export function signToken(payload, expiresInDays = 7) {
  const days = Number.isInteger(Number(expiresInDays)) ? Math.min(30, Math.max(1, Number(expiresInDays))) : 7;
  return jwt.sign(payload, getJwtSecret(), { expiresIn: `${days}d` });
}

// Verifies a signed token. Configuration errors remain server errors; invalid tokens return null.
export function verifyToken(token) {
  if (!token) return null;
  const secret = getJwtSecret();

  try {
    return jwt.verify(token, secret, { algorithms: ["HS256"] });
  } catch {
    return null;
  }
}

// Reads the auth token from the incoming request cookies.
export function readTokenFromRequest(request) {
  return request.cookies?.get(AUTH_COOKIE_NAME)?.value || null;
}

// Reads the auth token from the server-side cookie store.
export async function readTokenFromCookieStore() {
  return (await cookies()).get(AUTH_COOKIE_NAME)?.value || null;
}

// Store only the signed token in an HttpOnly cookie; never store credentials in localStorage.
export function applyAuthCookie(response, token, expiresInDays = 7) {
  const days = Number.isInteger(Number(expiresInDays)) ? Math.min(30, Math.max(1, Number(expiresInDays))) : 7;
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * days,
  });
  return response;
}

// Extracts the authenticated user payload from the app's own signed cookie.
export async function getAuthenticatedUser(request) {
  const legacyToken = readTokenFromRequest(request);
  const payload = legacyToken ? verifyToken(legacyToken) : null;

  if (!payload?.sub) {
    return null;
  }

  return {
    userId: payload.userId || payload.sub,
    role: payload.role || "owner",
    payload,
  };
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

// Creates the JWT payload from a user record.
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
  if (!auth) {
    return false;
  }

  if (!roles.length) {
    return true;
  }

  return roles.includes(auth.role);
}
