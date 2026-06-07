import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import {
  account,
  session,
  user,
  verification,
} from "@/lib/db/schema";

/**
 * Build a request-scoped better-auth instance.
 *
 * On Cloudflare Workers the D1 binding is only available within a request
 * scope (via `getCloudflareContext`), so we cannot create a module-level
 * singleton. Call `getAuth()` inside Route Handlers, Server Components, or
 * Server Actions to obtain a configured instance for the current request.
 *
 * `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` are read from the environment
 * (`.dev.vars` locally, Worker secrets/vars in production). `@opennextjs/cloudflare`
 * populates `process.env` from the Worker environment at runtime.
 */
export async function getAuth() {
  const db = await getDb();

  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: { user, session, account, verification },
      // D1 does not support interactive transactions; run operations sequentially.
      transaction: false,
    }),
    emailAndPassword: {
      enabled: true,
      // Users must confirm their email before they can sign in.
      requireEmailVerification: true,
    },
    emailVerification: {
      // Send a verification email immediately after sign up.
      sendOnSignUp: true,
      // Re-send verification on a sign-in attempt by an unverified user.
      sendOnSignIn: true,
      // Sign the user in automatically once they click the verification link.
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user: u, url }) => {
        await sendEmail({
          to: u.email,
          subject: "Verify your email for DDR Trace",
          html: `
            <div style="font-family: sans-serif; line-height: 1.6; color: #111;">
              <h2>Confirm your email</h2>
              <p>Hi ${u.name || "there"}, welcome to DDR Trace!</p>
              <p>Please confirm your email address to activate your account:</p>
              <p>
                <a href="${url}"
                   style="display:inline-block;background:#111;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;">
                  Verify email
                </a>
              </p>
              <p style="color:#666;font-size:13px;">
                Or paste this link into your browser:<br />
                <a href="${url}">${url}</a>
              </p>
            </div>
          `,
          text: `Confirm your email for DDR Trace by visiting: ${url}`,
        });
      },
    },
    // Keep `nextCookies` last so it can set cookies on outgoing responses.
    plugins: [nextCookies()],
  });
}

export type Auth = Awaited<ReturnType<typeof getAuth>>;
