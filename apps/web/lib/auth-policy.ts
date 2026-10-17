type AuthEnvironment = {
  NODE_ENV?: string;
  BETTER_AUTH_URL?: string;
  BETTER_AUTH_SECRET?: string;
  NEXT_PUBLIC_APP_URL?: string;
};

export function resolveAuthPolicy(env: AuthEnvironment, requestOrigin?: string) {
  const production = env.NODE_ENV === 'production';
  if (production && (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32)) {
    throw new Error('BETTER_AUTH_SECRET must be set to at least 32 characters in production');
  }
  // Production trust must not come from the request Host header.
  const value = env.BETTER_AUTH_URL || (production ? 'https://gachia.com' : requestOrigin || env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
      (production ? url.protocol !== 'https:' : !['https:', 'http:'].includes(url.protocol))) {
    throw new Error('Auth base URL must be an origin; HTTPS is required in production');
  }
  return { baseURL: url.origin, trustedOrigins: [url.origin],
    advanced: { disableOriginCheck: false, disableCSRFCheck: false },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 } };
}
