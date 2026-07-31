import { NextResponse } from "next/server";

export async function middleware(request) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.).*)",
  ],
};
