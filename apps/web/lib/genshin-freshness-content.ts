import { getCloudflareContext } from '@opennextjs/cloudflare';
import { genshinFreshnessGuidesSchema } from '@gachia/core/genshin-freshness';
import { GenshinContentUnavailableError, readGenshinContentJSON, type GenshinPlatformBindings } from './genshin-content-reader';

const paths = { owner: '/_games/genshin/content/data/raw-guides.json', compatibility: '/data/genshin/raw-guides.json' };

export async function readGenshinFreshnessGuides(env: GenshinPlatformBindings) {
  const guides = await readGenshinContentJSON(env, paths, 1024 * 1024, value => genshinFreshnessGuidesSchema.parse(value));
  return { guides, source: env.GENSHIN_CONTENT_ENABLED === 'true' ? paths.owner : paths.compatibility };
}

export async function getGenshinFreshnessGuides() {
  try {
    return await readGenshinFreshnessGuides(getCloudflareContext().env);
  } catch {
    throw new GenshinContentUnavailableError();
  }
}
