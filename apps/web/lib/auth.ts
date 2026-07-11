import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { NextRequest } from 'next/server';
import { nextCookies } from 'better-auth/next-js';
import { getDb } from './db';
import { users, sessions, accounts, verifications } from '@gachia/db';

function resolveBaseURL(request?: NextRequest) {
  if (request) {
    return request.nextUrl.origin;
  }

  return process.env.BETTER_AUTH_URL
    || process.env.NEXT_PUBLIC_APP_URL
    || 'https://gachia.com';
}

export function createAuth(request?: NextRequest) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const betterAuthUrl = process.env.BETTER_AUTH_URL;
  const betterAuthSecret = process.env.BETTER_AUTH_SECRET;

  if (process.env.NODE_ENV === 'production' && (!betterAuthSecret || betterAuthSecret.length < 32)) {
    throw new Error('BETTER_AUTH_SECRET must be set to at least 32 characters in production');
  }

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
    baseURL: betterAuthUrl || resolveBaseURL(request),
    secret: betterAuthSecret || 'dev-secret-change-in-production',
  });
}
