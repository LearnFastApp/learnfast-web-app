import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/analytics",
  "/settings",
  "/sessions",
  "/learning-hub",
  "/pricing",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const authCookie = req.cookies.get("learnfast_auth");
  if (!authCookie) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/analytics/:path*",
    "/settings/:path*",
    "/sessions/:path*",
    "/learning-hub/:path*",
    "/pricing/:path*",
  ],
};
