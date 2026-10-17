// Logout clears this browser cookie and revokes all tokens issued before this logout.
import { success } from "@/app/lib/response";
import { clearAuthCookie, getAuthenticatedUser } from "@/app/lib/security";
import dbConnect from "@/app/lib/db";
import User from "@/app/models/userSchema";

export async function POST(request) {
  // Always clear the local cookie, even if revocation cannot reach the database.
  try {
    const auth = await getAuthenticatedUser(request);
    if (auth?.userId) {
      await dbConnect();
      const tokenVersion = Number(auth.payload?.tokenVersion || 0);
      await User.updateOne(
        {
          _id: auth.userId,
          $or: [
            { tokenVersion },
            { tokenVersion: { $exists: false } },
          ],
        },
        { $inc: { tokenVersion: 1 } }
      );
    }
  } catch {
    // Local logout should still complete; other protected requests validate the live token.
  }

  return clearAuthCookie(success("Logout successful"));
}
