// Auth route that revokes the current server-side session and clears its cookie.
import { success } from "@/app/lib/response";
import { clearAuthCookie, revokeAuthSessionFromRequest } from "@/app/lib/security";

export async function POST(request) {
  const response = success("Logout successful");

  // Always clear the browser cookie, even if the database is temporarily unavailable.
  try {
    await revokeAuthSessionFromRequest(request);
  } catch {
    // The client has still been logged out locally; expired sessions are rejected by date.
  }

  return clearAuthCookie(response);
}
