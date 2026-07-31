// Auth route that applies a new password from a reset token.
import { success, failure, normalizeError } from "@/app/lib/response";
import { parseJsonBody, rateLimit, jsonError } from "@/app/lib/apiHelpers";
import { resetPassword } from "@/app/services/authService";

export async function POST(request) {
  try {
    const body = await parseJsonBody(request);
    const limit = rateLimit(`reset:${String(body?.token || request.headers.get("x-forwarded-for") || "anon").toLowerCase()}`, {
      limit: 8,
      windowMs: 10 * 60 * 1000,
    });
    if (!limit.allowed) {
      return jsonError("Too many requests. Please try again later.", 429);
    }

    const result = await resetPassword(body);
    return success("Password reset successful", result);
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
