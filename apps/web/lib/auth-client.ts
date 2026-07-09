'use client';

import { createAuthClient } from 'better-auth/react';

// Keep the client on the current origin by letting better-auth use its
// built-in same-origin `/api/auth` fallback.
const authClient = createAuthClient();

export const { useSession, signIn, signOut } = authClient;
