// Auth route for creating a new user account.
import { success, failure, normalizeError } from "@/app/lib/response";
import { applyAuthCookie } from "@/app/lib/security";
import { registerUser } from "@/app/services/authService";
import { parseJsonBody, rateLimit, jsonError, getClientIp } from "@/app/lib/apiHelpers";

export async function POST(request) {
  try {
    const body = await parseJsonBody(request);
    const email = String(body?.email || "unknown").trim().toLowerCase();
    const ip = getClientIp(request);
    const [emailLimit, ipLimit] = await Promise.all([
      rateLimit(`signup-email:${email}`, { limit: 5, windowMs: 10 * 60 * 1000 }),
      rateLimit(`signup-ip:${ip}`, { limit: 20, windowMs: 10 * 60 * 1000 }),
    ]);
    if (!emailLimit.allowed || !ipLimit.allowed) {
      return jsonError("Too many signup attempts. Please try again later.", 429);
    }
    const { user, token } = await registerUser(body);

    const response = success("Signup successful", {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    }, null, 201);

    return applyAuthCookie(response, token);
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
