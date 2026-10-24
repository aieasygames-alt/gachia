import 'server-only';
import { INDEXNOW_POLICY, normalizeIndexNowUrls } from '@gachia/core/indexnow-policy.mjs';

/**
 * Compatibility helper. Outbound notifications stay paused until separately approved.
 */
export async function notifyIndexNow(paths: string[]): Promise<void> {
  try {
    normalizeIndexNowUrls(paths);
    console.warn(INDEXNOW_POLICY.message);
  } catch (error) {
    console.error('IndexNow candidate validation failed:', error);
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
