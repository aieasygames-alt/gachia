import features from '../site-features.json';

// Checked in with the build so browser, Worker and release checks agree.
export const ACCOUNT_FEATURES_ENABLED = features.accountFeatures === true;

export function accountFeatureUnavailable(): Response | null {
  if (ACCOUNT_FEATURES_ENABLED) return null;
  return Response.json({ error: 'Account features are disabled', code: 'ACCOUNT_FEATURES_DISABLED' }, {
    status: 404,
    headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  });
}
