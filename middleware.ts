import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Locale routing
// Strategy: sub-path (/fr/...) — "en" has no prefix (existing URLs unchanged).
// Resolution order: URL prefix → lf_locale cookie → Accept-Language → "en".
// The /fr prefix is stripped before routing so pages don't need to know about it.
// ---------------------------------------------------------------------------

const SUPPORTED_LOCALES = ["fr"] as const; // "en" is default — no prefix needed

function detectLocale(req: NextRequest): "en" | "fr" {
  const { pathname } = req.nextUrl;

  // 1. URL prefix
  if (pathname.startsWith("/fr") && (pathname.length === 3 || pathname[3] === "/")) {
    return "fr";
  }

  // 2. Cookie (set by LocaleProvider on client)
  const cookie = req.cookies.get("lf_locale")?.value;
  if (cookie === "fr") return "fr";

  // 3. Accept-Language header
  const acceptLang = req.headers.get("accept-language") ?? "";
  if (/\bfr\b/i.test(acceptLang.split(",")[0])) return "fr";

  return "en";
}

// ---------------------------------------------------------------------------
// Auth guard (existing behaviour preserved)
// ---------------------------------------------------------------------------

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/analytics",
  "/settings",
  "/sessions",
  "/learning-hub",
  "/pricing",
  "/leaderboard",
  "/ai-assessment",
  "/rehearse",
  "/admin",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Strip /fr prefix for routing — rewrite to the canonical path
  if (pathname.startsWith("/fr/") || pathname === "/fr") {
    const locale = "fr";
    const strippedPath = pathname.slice(3) || "/";
    const url = req.nextUrl.clone();
    url.pathname = strippedPath;

    const res = NextResponse.rewrite(url);
    res.cookies.set("lf_locale", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });

    // Also apply auth guard for protected paths
    const authCookie = req.cookies.get("learnfast_auth");
    const isProtected = PROTECTED_PREFIXES.some((p) => strippedPath.startsWith(p));
    if (isProtected && !authCookie) {
      const loginUrl = new URL("/auth/login", req.url);
      loginUrl.searchParams.set("redirect", strippedPath);
      return NextResponse.redirect(loginUrl);
    }

    return res;
  }

  // For non-/fr paths: detect locale from cookie/header and keep cookie fresh
  const locale = detectLocale(req);
  const res = NextResponse.next();
  if (locale === "fr") {
    res.cookies.set("lf_locale", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  // Auth guard
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return res;

  const authCookie = req.cookies.get("learnfast_auth");
  if (!authCookie) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: [
    "/fr/:path*",
    "/dashboard/:path*",
    "/analytics/:path*",
    "/settings/:path*",
    "/sessions/:path*",
    "/learning-hub/:path*",
    "/pricing/:path*",
    "/leaderboard/:path*",
    "/leaderboard",
    "/ai-assessment/:path*",
    "/ai-assessment",
    "/rehearse/:path*",
    "/admin/:path*",
  ],
};
