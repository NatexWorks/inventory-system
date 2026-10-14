// Auth route that resets a password using email OTP (legacy reset tokens remain valid until expiry).
import { success, failure, normalizeError } from "@/app/lib/response";
import { parseJsonBody, rateLimit, jsonError } from "@/app/lib/apiHelpers";
import { resetPassword } from "@/app/services/authService";

export async function POST(request) {
  try {
    const body = await parseJsonBody(request);
    const email = String(body?.email || "unknown").toLowerCase();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limit = rateLimit(`reset-email:${email}`, {
      limit: 8,
      windowMs: 10 * 60 * 1000,
    });
    const ipLimit = rateLimit(`reset-ip:${ip}`, {
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });
    if (!limit.allowed || !ipLimit.allowed) {
      return jsonError("Too many requests. Please try again later.", 429);
    }

    const result = await resetPassword(body);
    return success("Password reset successful", result);
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
