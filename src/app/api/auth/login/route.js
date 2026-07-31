// Auth route for verifying credentials and starting a session.
import { success, failure, normalizeError } from "@/app/lib/response";
import { applyAuthCookie } from "@/app/lib/security";
import { loginUser } from "@/app/services/authService";
import { parseJsonBody, rateLimit, jsonError } from "@/app/lib/apiHelpers";

export async function POST(request) {
  try {
    const body = await parseJsonBody(request);
    const limit = rateLimit(`login:${String(body?.email || request.headers.get("x-forwarded-for") || "anon").toLowerCase()}`, {
      limit: 10,
      windowMs: 10 * 60 * 1000,
    });
    if (!limit.allowed) {
      return jsonError("Too many login attempts. Please try again later.", 429);
    }
    const { user, token } = await loginUser(body);

    const response = success("Login successful", {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    return applyAuthCookie(response, token);
  } catch (error) {
    const normalized = normalizeError(error);
    console.log(normalized);
    
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
