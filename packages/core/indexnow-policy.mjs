export const INDEXNOW_POLICY = Object.freeze({
  mode: 'paused',
  reason: 'content_and_production_review_required',
  message: 'IndexNow outbound submission is paused pending content review and cross-owner production acceptance. Offline plans are not approval.',
});

const BASE_URL = 'https://gachia.com';

export function normalizeIndexNowUrl(value) {
  if (typeof value !== 'string' || !value || value.length > 2048) throw new Error('Invalid IndexNow URL');
  // Accept only literal canonical page paths; do not normalize ambiguous inputs.
  const absolute = value.startsWith('/') && !value.startsWith('//') ? BASE_URL + value : value;
  if (absolute.length > 2048 || !/^https:\/\/gachia\.com\/(?:zh|en|ja)(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(absolute)) {
    throw new Error('IndexNow requires canonical production page URLs without credentials, ports, query, fragment or encoded paths');
  }
  if (new URL(absolute).href !== absolute) throw new Error('Noncanonical IndexNow URL');
  return absolute;
}

export function normalizeIndexNowUrls(values) {
  if (!Array.isArray(values) || !values.length || values.length > 10000) throw new Error('IndexNow requires 1 to 10000 candidate URLs');
  return [...new Set(values.map(normalizeIndexNowUrl))];
}
