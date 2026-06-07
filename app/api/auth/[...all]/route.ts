import { getAuth } from "@/lib/auth";

/**
 * better-auth catch-all route handler.
 *
 * `getAuth()` is request-scoped because the Cloudflare D1 binding is only
 * available within a request, so the instance is created per request and its
 * `handler` is delegated the full Request.
 */
export async function GET(request: Request): Promise<Response> {
  const auth = await getAuth();
  return auth.handler(request);
}

export async function POST(request: Request): Promise<Response> {
  const auth = await getAuth();
  return auth.handler(request);
}
