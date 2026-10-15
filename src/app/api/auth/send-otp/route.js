import { success, failure, normalizeError } from "@/app/lib/response";
import { parseJsonBody, rateLimit, jsonError, getClientIp } from "@/app/lib/apiHelpers";
import { sendOtpSchema } from "@/app/lib/validation";
import { sendEmailOtp } from "@/app/services/otpService";

export async function POST(request) {
  try {
    const body = sendOtpSchema.parse(await parseJsonBody(request));
    const email = body.email.toLowerCase();
    const ip = getClientIp(request);

    const [emailLimit, ipLimit] = await Promise.all([
      rateLimit(`otp-email:${body.purpose}:${email}`, { limit: 5, windowMs: 15 * 60 * 1000 }),
      rateLimit(`otp-ip:${body.purpose}:${ip}`, { limit: 15, windowMs: 15 * 60 * 1000 }),
    ]);

    if (!emailLimit.allowed || !ipLimit.allowed) {
      return jsonError("Too many code requests. Please try again later.", 429);
    }

    const result = await sendEmailOtp(body);
    const message = body.purpose === "signup"
      ? "If this email can be registered, a verification code has been sent."
      : "If an active account exists for this email, a password reset code has been sent.";

    return success(message, {
      accepted: true,
      ...(result.developmentOtp ? { developmentOtp: result.developmentOtp } : {}),
    });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
