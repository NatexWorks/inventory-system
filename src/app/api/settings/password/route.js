import { failure, normalizeError, success } from "@/app/lib/response";
import { assertAuth, parseJsonBody } from "@/app/lib/apiHelpers";
import dbConnect from "@/app/lib/db";
import User from "@/app/models/userSchema";
import { changePasswordSchema } from "@/app/lib/validation";
import { comparePassword, hashPassword } from "@/app/lib/security";

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
    await user.save();
    return success("Password updated successfully.");
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
