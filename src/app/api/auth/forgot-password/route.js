// Auth route that sends a password-reset OTP by email.
import { success, failure, normalizeError } from "@/app/lib/response";
import { parseJsonBody, rateLimit, jsonError } from "@/app/lib/apiHelpers";
import { requestPasswordReset } from "@/app/services/authService";

export async function POST(request) {
  try {
    const body = await parseJsonBody(request);
    const limit = rateLimit(`forgot:${String(body?.email || request.headers.get("x-forwarded-for") || "anon").toLowerCase()}`, {
      limit: 5,
      windowMs: 10 * 60 * 1000,
    });
    if (!limit.allowed) {
      return jsonError("Too many requests. Please try again later.", 429);
    }

    const result = await requestPasswordReset(body);
    return success("If an active account exists for this email, a password reset code has been sent.", { accepted: true, ...(result.developmentOtp ? { developmentOtp: result.developmentOtp } : {}) });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
