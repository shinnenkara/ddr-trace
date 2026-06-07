// Secrets/vars that live in `.dev.vars` (local) and Worker secrets (production)
// are not declared in `wrangler.jsonc`, so `wrangler types` does not add them to
// `CloudflareEnv`. Augment the generated interface here so they are typed on
// `getCloudflareContext().env`.
interface CloudflareEnv {
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  RESEND_API_KEY: string;
  RESEND_DOMAIN: string;
}
