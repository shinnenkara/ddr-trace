import { getCloudflareContext } from "@opennextjs/cloudflare";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/**
 * Send a transactional email through the Resend HTTP API.
 *
 * Reads `RESEND_API_KEY` and `RESEND_DOMAIN` from the Cloudflare environment.
 * `RESEND_DOMAIN` holds the sender address (e.g. `onboarding@resend.dev` for
 * Resend's free test sender, which can only deliver to your own account email).
 *
 * Values come from `getCloudflareContext().env`, which is populated from
 * `.dev.vars` during `next dev` and from Worker secrets/vars in production.
 * (`.dev.vars` is loaded by Wrangler and is NOT exposed on `process.env`
 * during `next dev`.)
 *
 * Uses `fetch` directly so it works on the Cloudflare Workers runtime without
 * pulling in the Node-oriented Resend SDK.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailParams): Promise<void> {
  const { env } = await getCloudflareContext({ async: true });
  const apiKey = env.RESEND_API_KEY;
  const sender = env.RESEND_DOMAIN;

  if (!apiKey || !sender) {
    throw new Error(
      "Missing RESEND_API_KEY or RESEND_DOMAIN environment variables.",
    );
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `DDR Trace <${sender}>`,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend request failed (${res.status}): ${body}`);
  }
}
