import { NextResponse } from "next/server";

const PRIVATE_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/dashboard",
  "/settings",
  "/reports",
  "/orders",
  "/pos",
  "/products",
  "/categories",
  "/suppliers",
  "/addProducts",
];

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const isPrivatePage = PRIVATE_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
  const response = NextResponse.next();

  if (isPrivatePage) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.).*)",
  ],
};
