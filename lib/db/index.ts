import { drizzle } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "./schema";

/**
 * Drizzle client bound to the Cloudflare D1 database (`ddr_trace_db`).
 *
 * Must be called within a request scope (Server Component, Route Handler,
 * or Server Action). Uses the async form of `getCloudflareContext` so it
 * also works during static prerendering with `next dev`.
 */
export async function getDb() {
  const { env } = await getCloudflareContext({ async: true });
  return drizzle(env.ddr_trace_db, { schema });
}
