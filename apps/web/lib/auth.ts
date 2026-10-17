import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { NextRequest } from 'next/server';
import { nextCookies } from 'better-auth/next-js';
import { getDb } from './db';
import { users, sessions, accounts, verifications } from '@gachia/db';
import { resolveAuthPolicy } from './auth-policy';

export function createAuth(request?: NextRequest) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
  const policy = resolveAuthPolicy(process.env, request?.nextUrl.origin);

  if (!betterAuthSecret) {
    console.warn('WARNING: BETTER_AUTH_SECRET not set. Using a local-development-only secret.');
  }

  const socialProviders = googleClientId && googleClientSecret
    ? {
        google: {
          clientId: googleClientId,
          clientSecret: googleClientSecret,
        },
      }
    : {};

  if (!googleClientId || !googleClientSecret) {
    console.warn('WARNING: Google OAuth env vars are not set. Auth session endpoints will still work, but Google sign-in will be disabled until GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are configured.');
  }

  return betterAuth({
    database: drizzleAdapter(getDb(), {
      provider: 'sqlite',
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
      },
      camelCase: true,
    }),
    socialProviders,
    plugins: [nextCookies()],
    ...policy,
    secret: betterAuthSecret || 'dev-secret-change-in-production',
  });
}
