import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { getDb } from './db';
import { users, sessions, accounts, verifications } from '@gachia/db';

export function createAuth() {
  // CRITICAL FIX: Validate required environment variables
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const betterAuthUrl = process.env.BETTER_AUTH_URL;
  const betterAuthSecret = process.env.BETTER_AUTH_SECRET;

  // Throw clear errors if required variables are missing
  if (!googleClientId || !googleClientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are required');
  }

  if (!betterAuthSecret) {
    console.warn('WARNING: BETTER_AUTH_SECRET not set. Session tokens may not be consistently validated across Workers. Set a 32+ character random string.');
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
    socialProviders: {
      google: {
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      },
    },
    plugins: [nextCookies()],
    baseURL: betterAuthUrl || 'https://gachia.com',
    secret: betterAuthSecret || 'dev-secret-change-in-production', // Fallback for dev only
  });
}
