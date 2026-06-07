import { createAuthClient } from "better-auth/react";

/**
 * Browser-side better-auth client.
 *
 * `baseURL` defaults to the current origin, so it only needs to be set
 * explicitly when the auth server lives on a different domain.
 */
export const authClient = createAuthClient({});

export const { signIn, signUp, signOut, useSession } = authClient;
