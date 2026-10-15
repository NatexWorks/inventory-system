// Auth route that sends a password-reset OTP by email.
import { success, failure, normalizeError } from "@/app/lib/response";
import { parseJsonBody, rateLimit, jsonError, getClientIp } from "@/app/lib/apiHelpers";
import { requestPasswordReset } from "@/app/services/authService";

export async function POST(request) {
  try {
    const body = await parseJsonBody(request);
    const email = String(body?.email || "unknown").toLowerCase();
    const ip = getClientIp(request);
    const [limit, ipLimit] = await Promise.all([
      rateLimit(`forgot-email:${email}`, { limit: 5, windowMs: 10 * 60 * 1000 }),
      rateLimit(`forgot-ip:${ip}`, { limit: 15, windowMs: 10 * 60 * 1000 }),
    ]);
    if (!limit.allowed || !ipLimit.allowed) {
      return jsonError("Too many requests. Please try again later.", 429);
    }

    const result = await requestPasswordReset(body);
    if (!result.accountExists) {
      return success("No account was found for this email. Create an account to get started.", {
        accepted: true,
        accountExists: false,
      });
    }

    return success("A password reset code has been sent to your email.", {
      accepted: true,
      accountExists: true,
      ...(result.developmentOtp ? { developmentOtp: result.developmentOtp } : {}),
    });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
