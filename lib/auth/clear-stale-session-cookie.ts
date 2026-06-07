import { headers } from "next/headers";
import { cookies } from "next/headers";
import { getSessionCookie } from "better-auth/cookies";
import { getSessionUser } from "@/lib/api/get-session-user";

const AUTH_COOKIE_PREFIXES = ["better-auth", "__Secure-better-auth"];

/** Read-only: cookie present but no valid session in D1. */
export async function hasStaleSessionCookie(): Promise<boolean> {
  const headerList = await headers();
  if (!getSessionCookie(headerList)) {
    return false;
  }

  const user = await getSessionUser();
  return !user;
}

/** Route Handler / Server Action only — mutates cookies. */
export async function deleteAuthSessionCookies(): Promise<void> {
  const cookieStore = await cookies();
  for (const cookie of cookieStore.getAll()) {
    if (
      AUTH_COOKIE_PREFIXES.some((prefix) => cookie.name.startsWith(prefix))
    ) {
      cookieStore.delete(cookie.name);
    }
  }
}
