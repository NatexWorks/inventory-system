// Auth route that returns the current authenticated user.
import { failure, normalizeError, success } from "@/app/lib/response";
import { assertAuth } from "@/app/lib/apiHelpers";
import dbConnect from "@/app/lib/db";
import User from "@/app/models/userSchema";

export async function GET(request) {
  try {
    const auth = await assertAuth(request);

    await dbConnect();
    const user = await User.findById(auth.userId).select("-passwordHash -tokenVersion").lean();

    if (!user) {
      return failure("User not found", null, 404);
    }

    return success("Current user fetched successfully", { user });
  } catch (error) {
    const normalized = normalizeError(error);
    if (normalized.status === 401 || normalized.status === 403) {
      return failure("Unauthorized", null, 401);
    }
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
