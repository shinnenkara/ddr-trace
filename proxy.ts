import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { defaultLocale, isLocale } from "@/lib/i18n/config";

/**
 * Optimistic auth routing (Next.js 16 Proxy, formerly Middleware).
 *
 * This only checks for the presence of the better-auth session cookie — it does
 * NOT hit the database, per the Next.js guidance that Proxy runs on every
 * request (including prefetches). The authoritative check happens server-side
 * via `getAuth().api.getSession(...)` where session data is actually needed.
 */
const PUBLIC_ROUTES = ["/login", "/signup", "/verify-email"];

function applyLocaleCookie(request: NextRequest, response: NextResponse) {
  if (!request.cookies.get("locale")?.value) {
    const acceptLanguage = request.headers.get("accept-language");
    let detectedLocale = defaultLocale;

    if (acceptLanguage) {
      const preferredLocale = acceptLanguage
        .split(",")[0]
        .split("-")[0]
        .toLowerCase();

      if (isLocale(preferredLocale)) {
        detectedLocale = preferredLocale;
      }
    }

    response.cookies.set("locale", detectedLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // Unauthenticated users get sent to the sign-in page.
  // Auth pages stay reachable when a cookie exists — cookie presence alone does
  // not mean a valid session (stale cookies after D1 resets, etc.).
  if (!hasSession && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return applyLocaleCookie(request, NextResponse.redirect(loginUrl));
  }

  return applyLocaleCookie(request, NextResponse.next());
}

export const config = {
  // Run on everything except API routes, Next.js internals, and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
