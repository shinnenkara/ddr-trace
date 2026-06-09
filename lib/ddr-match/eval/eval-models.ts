import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const EVAL_LITE_MODEL = "gemini-2.5-flash-lite";
export const EVAL_EMBED_MODEL = "text-embedding-004";

export function getEvalApiKey(): string {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY is not configured (set in .dev.vars)",
    );
  }
  return apiKey;
}

export function createEvalGoogle() {
  return createGoogleGenerativeAI({ apiKey: getEvalApiKey() });
}
