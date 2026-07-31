// Auth route that clears the session cookie.
import { success } from "@/app/lib/response";
import { clearAuthCookie } from "@/app/lib/security";
import { NextResponse } from "next/server";

export async function POST() {
  const response = success("Logout successful");
  return clearAuthCookie(response);
}
