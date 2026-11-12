import { getCloudflareContext } from '@opennextjs/cloudflare';
import { ntePlatformSchema } from '@gachia/core/nte-platform';
import { readGenshinContentJSON } from './genshin-content-reader';

export interface NtePlatformBindings {
  ASSETS?: Pick<Fetcher, 'fetch'>;
  NTE_CONTENT?: Pick<Fetcher, 'fetch'>;
  NTE_CONTENT_ENABLED?: string;
}
export const NTE_UNAVAILABLE = {
  zh: '异环资料暂不可用，请稍后重试。', en: 'NTE content is temporarily unavailable. Please try again later.', ja: '異環のデータは一時的に利用できません。後ほど再度お試しください。',
};
export async function readNtePlatformContent(env: NtePlatformBindings) {
  return readGenshinContentJSON({ ASSETS: env.ASSETS, GENSHIN_CONTENT: env.NTE_CONTENT, GENSHIN_CONTENT_ENABLED: env.NTE_CONTENT_ENABLED },
    { owner: '/_games/nte/content/platform.json', compatibility: '/data-client/nte-platform.json' }, 512 * 1024, value => ntePlatformSchema.parse(value));
}
export async function getNtePlatformContent() {
  return readNtePlatformContent(getCloudflareContext().env as NtePlatformBindings);
}
