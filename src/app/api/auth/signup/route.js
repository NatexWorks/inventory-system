// Auth route for creating a new user account.
import { success, failure, normalizeError } from "@/app/lib/response";
import { applyAuthCookie } from "@/app/lib/security";
import { registerUser } from "@/app/services/authService";
import { parseJsonBody, rateLimit, jsonError } from "@/app/lib/apiHelpers";

export async function POST(request) {
  try {
    const body = await parseJsonBody(request);
    const limit = rateLimit(`signup:${String(body?.email || request.headers.get("x-forwarded-for") || "anon").toLowerCase()}`, {
      limit: 5,
      windowMs: 10 * 60 * 1000,
    });
    if (!limit.allowed) {
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
