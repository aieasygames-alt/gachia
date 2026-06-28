const BASE_URL = 'https://gachia.com';

/**
 * Notify search engines about new/updated URLs via IndexNow.
 * Fire-and-forget — do not block the response.
 * CRITICAL FIX: Make this function async and add proper error handling
 */
export async function notifyIndexNow(paths: string[]): Promise<void> {
  if (!paths || paths.length === 0) {
    console.warn('notifyIndexNow called with empty paths array');
    return;
  }

  if (paths.length > 10000) {
    console.warn(`notifyIndexNow called with ${paths.length} URLs, exceeding 10000 limit`);
    return;
  }

  const urls = paths.map((p) => `${BASE_URL}${p}`);

  try {
    const response = await fetch('/api/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls }),
    });

    if (!response.ok) {
      console.error(`IndexNow notification failed: ${response.status}`);
    }
  } catch (error) {
    // Fire-and-forget: log error but don't throw
    console.error('IndexNow notification error:', error);
  }
}

/**
 * Notify IndexNow about a single URL (convenience function)
 */
export async function notifySingleUrl(path: string): Promise<void> {
  return notifyIndexNow([path]);
}

/**
 * Notify IndexNow about character page updates
 */
export async function notifyCharacterUpdate(gameId: string, characterId: string): Promise<void> {
  const paths = ['zh', 'en', 'ja'].map((lang) => `/${lang}/${gameId}/characters/${characterId}`);
  await notifyIndexNow(paths);
}

/**
 * Notify IndexNow about game page updates
 */
export async function notifyGameUpdate(gameId: string): Promise<void> {
  const paths = ['zh', 'en', 'ja'].map((lang) => `/${lang}/${gameId}/characters`);
  await notifyIndexNow(paths);
}
