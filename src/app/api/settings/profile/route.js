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

    const currentUser = await User.findById(auth.userId).select("email").lean();
    if (!currentUser) return failure("User not found.", null, 404);

    // Account email is immutable in Settings; changing it requires a separate verified-email flow.
    if (payload.email.toLowerCase() !== currentUser.email.toLowerCase()) {
      return failure("Account email cannot be changed from Settings.", null, 400);
    }

    const user = await User.findByIdAndUpdate(
      auth.userId,
      { $set: { name: payload.name, phone: payload.phone || "" } },
      { new: true, runValidators: true }
    ).select("-passwordHash").lean();

    if (!user) return failure("User not found.", null, 404);
    return success("Profile updated successfully.", { user });
  } catch (error) {
    const normalized = normalizeError(error);
    return failure(normalized.message, normalized.errors, normalized.status);
  }
}
