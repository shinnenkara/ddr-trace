import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Reads `GOOGLE_GENERATIVE_AI_API_KEY` from the Cloudflare environment.
 * `.dev.vars` is loaded by Wrangler and is not available on `process.env` during `next dev`.
 */
export async function getGoogleGenerativeAiApiKey(): Promise<string> {
  const { env } = await getCloudflareContext({ async: true });
  const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured");
  }

  return apiKey;
}
