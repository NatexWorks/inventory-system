// Auth route for verifying credentials and starting a session.
import { success, failure, normalizeError } from "@/app/lib/response";
import { applyAuthCookie } from "@/app/lib/security";
import { loginUser } from "@/app/services/authService";
import { parseJsonBody, rateLimit, jsonError, getClientIp } from "@/app/lib/apiHelpers";

export async function POST(request) {
  try {
    const body = await parseJsonBody(request);
    const email = String(body?.email || "unknown").trim().toLowerCase();
    const ip = getClientIp(request);
    const [emailLimit, ipLimit] = await Promise.all([
      rateLimit(`login-email:${email}`, { limit: 10, windowMs: 10 * 60 * 1000 }),
      rateLimit(`login-ip:${ip}`, { limit: 50, windowMs: 10 * 60 * 1000 }),
    ]);
    if (!emailLimit.allowed || !ipLimit.allowed) {
      return jsonError("Too many login attempts. Please try again later.", 429);
    }
    const { user, sessionId, tokenDays } = await loginUser(body);

    const response = success("Login successful", {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    return applyAuthCookie(response, sessionId, tokenDays);
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
