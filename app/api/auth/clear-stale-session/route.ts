import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSessionCookie } from "better-auth/cookies";
import { deleteAuthSessionCookies } from "@/lib/auth/clear-stale-session-cookie";
import { getSessionUserFromRequest } from "@/lib/api/get-session-user";

export async function GET(request: Request) {
  const hasCookie = Boolean(getSessionCookie(await headers()));
  const user = hasCookie ? await getSessionUserFromRequest(request) : null;

  if (hasCookie && !user) {
    await deleteAuthSessionCookies();
  }

  return NextResponse.redirect(new URL("/login", request.url));
}
