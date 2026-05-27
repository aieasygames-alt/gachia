const BASE_URL = 'https://gachia.com';

/**
 * Notify search engines about new/updated URLs via IndexNow.
 * Fire-and-forget — do not block the response.
 */
export function notifyIndexNow(paths: string[]) {
  const urls = paths.map((p) => `${BASE_URL}${p}`);

  fetch('/api/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls }),
  }).catch(() => {});
}
