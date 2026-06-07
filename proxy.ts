import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Optimistic auth routing (Next.js 16 Proxy, formerly Middleware).
 *
 * This only checks for the presence of the better-auth session cookie — it does
 * NOT hit the database, per the Next.js guidance that Proxy runs on every
 * request (including prefetches). The authoritative check happens server-side
 * via `getAuth().api.getSession(...)` where session data is actually needed.
 */
const PUBLIC_ROUTES = ["/login", "/signup", "/verify-email"];

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // Signed-in users shouldn't see the auth screens.
  if (hasSession && isPublicRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Unauthenticated users get sent to the sign-in page.
  if (!hasSession && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except API routes, Next.js internals, and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
