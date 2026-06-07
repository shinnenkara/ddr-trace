import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";

/** Resolve the current user from better-auth (server actions, RSC). */
export async function getSessionUser() {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

/** Resolve the current user from an incoming Request (route handlers). */
export async function getSessionUserFromRequest(request: Request) {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user ?? null;
}
