// Auth route that returns the current authenticated user.
import { failure, normalizeError, success } from "@/app/lib/response";
import { assertAuth } from "@/app/lib/apiHelpers";
import { applyAuthCookie, createAuthSession, DEFAULT_SESSION_DAYS } from "@/app/lib/security";
import dbConnect from "@/app/lib/db";
import User from "@/app/models/userSchema";

export async function GET(request) {
  try {
    const auth = await assertAuth(request);

    await dbConnect();
    const user = await User.findById(auth.userId).select("-passwordHash").lean();

    if (!user) {
      return failure("User not found", null, 404);
    }

    // Upgrade an older signed JWT cookie to an opaque, one-month server-side
    // session without making the user sign in again after deployment.
    const safeUser = { ...user };
    delete safeUser.tokenVersion;
    const response = success("Current user fetched successfully", { user: safeUser });

    if (auth.isLegacyToken) {
      const session = await createAuthSession(user, DEFAULT_SESSION_DAYS);
      return applyAuthCookie(response, session.sessionId, session.tokenDays);
    }

    return response;
  } catch (error) {
    const normalized = normalizeError(error);
    if (normalized.status === 401 || normalized.status === 403) {
      return failure("Unauthorized", null, 401);
    }
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
