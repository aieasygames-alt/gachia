import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { getDb } from './db';
import { users, sessions, accounts, verifications } from '@gachia/db';

export function createAuth() {
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
        clientId: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      },
    },
    plugins: [nextCookies()],
    baseURL: process.env.BETTER_AUTH_URL || 'https://gachia.com',
  });
}
