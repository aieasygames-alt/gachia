import { getCloudflareContext } from '@opennextjs/cloudflare';
import { genshinPlatformSchema, type GenshinPlatformContent } from '@gachia/core/genshin-platform';
import { GenshinContentUnavailableError, readGenshinContentJSON, type GenshinPlatformBindings } from './genshin-content-reader';
export { GenshinContentUnavailableError, type GenshinPlatformBindings } from './genshin-content-reader';

export const GENSHIN_UNAVAILABLE = {
  zh: '原神资料暂不可用，请稍后重试。',
  en: 'Genshin content is temporarily unavailable. Please try again later.',
  ja: '原神のデータは一時的に利用できません。後ほど再度お試しください。',
};

export async function readGenshinPlatformContent(env: GenshinPlatformBindings): Promise<GenshinPlatformContent> {
  return readGenshinContentJSON(env, { owner: '/_games/genshin/content/platform.json',
    compatibility: '/data-client/genshin-platform.json' }, 512 * 1024, value => genshinPlatformSchema.parse(value));
}

export async function getGenshinPlatformContent() {
  try {
    return await readGenshinPlatformContent(getCloudflareContext().env);
  } catch {
    throw new GenshinContentUnavailableError();
  }
}
