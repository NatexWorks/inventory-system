// Auth route that returns the current authenticated user.
import { failure, success } from "@/app/lib/response";
import { assertAuth } from "@/app/lib/apiHelpers";
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

    return success("Current user fetched successfully", { user });
  } catch {
    return failure("Unauthorized", null, 401);
  }
}
