import { failure, normalizeError, success } from "@/app/lib/response";
import { assertAuth, parseJsonBody } from "@/app/lib/apiHelpers";
import dbConnect from "@/app/lib/db";
import User from "@/app/models/userSchema";
import { profileSchema } from "@/app/lib/validation";

export async function PUT(request) {
  try {
    const auth = await assertAuth(request);
    const body = await parseJsonBody(request);
    const payload = profileSchema.parse(body);
    await dbConnect();

    const email = payload.email.toLowerCase();
    const duplicate = await User.findOne({ email, _id: { $ne: auth.userId } }).select("_id").lean();
    if (duplicate) return failure("That email address is already in use.", null, 409);

    const user = await User.findByIdAndUpdate(
      auth.userId,
      { $set: { name: payload.name, email, phone: payload.phone || "" } },
      { new: true, runValidators: true }
    ).select("-passwordHash").lean();

    if (!user) return failure("User not found.", null, 404);
    return success("Profile updated successfully.", { user });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
