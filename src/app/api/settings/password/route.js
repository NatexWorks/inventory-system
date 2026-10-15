import { failure, normalizeError, success } from "@/app/lib/response";
import { assertAuth, parseJsonBody } from "@/app/lib/apiHelpers";
import dbConnect from "@/app/lib/db";
import User from "@/app/models/userSchema";
import { changePasswordSchema } from "@/app/lib/validation";
import { applyAuthCookie, comparePassword, createAuthPayload, hashPassword, signToken } from "@/app/lib/security";

export async function PUT(request) {
  try {
    const auth = await assertAuth(request);
    const payload = changePasswordSchema.parse(await parseJsonBody(request));
    await dbConnect();

    const user = await User.findById(auth.userId);
    if (!user) return failure("User not found.", null, 404);
    const currentMatches = await comparePassword(payload.currentPassword, user.passwordHash);
    if (!currentMatches) return failure("Current password is incorrect.", null, 400);
    if (payload.currentPassword === payload.newPassword) {
      return failure("Choose a new password that differs from the current password.", null, 400);
    }

    user.passwordHash = await hashPassword(payload.newPassword);
    user.tokenVersion = Number(user.tokenVersion || 0) + 1;
    await user.save();
    const response = success("Password updated. Other sessions have been signed out.");
    return applyAuthCookie(response, signToken(createAuthPayload(user)));
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
