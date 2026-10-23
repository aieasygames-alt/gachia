'use client';

import { createAuthClient } from 'better-auth/react';
import { ACCOUNT_FEATURES_ENABLED } from './site-features';

type SessionState = Pick<ReturnType<ReturnType<typeof createAuthClient>['useSession']>, 'data' | 'error' | 'isPending'>;
const disabledSession: SessionState = { data: null, error: null, isPending: false };
const disabledAction = async () => ({ data: null, error: { message: 'Account features are disabled' } });

// Do not initialize Better Auth's client, session polling or cross-tab listeners
// while accounts are offline. Existing local map progress remains usable.
const authClient = ACCOUNT_FEATURES_ENABLED ? createAuthClient() : null;
export const useSession = authClient?.useSession ?? (() => disabledSession);
export const signIn = authClient?.signIn ?? { social: disabledAction };
export const signOut = authClient?.signOut ?? disabledAction;
