import type { GameId } from '@gachia/core';
import type { GenshinPlatformContent } from '@gachia/core/genshin-platform';
import { getGenshinPlatformContent } from '@/lib/genshin-platform-content';
import {
  LIVE_BANNERS, LIVE_CODE_SUMMARIES, LIVE_GUIDES, LIVE_VERSION_UPDATES,
  type LiveBanner, type LiveCodeSummary, type LiveStatus,
} from '@/lib/live-content';

// Recommendation order belongs to the platform; names and images belong to the game.
const FEATURED_GENSHIN_IDS = ['hu-tao', 'raiden-shogun', 'furina', 'nahida', 'kazuha'];

export function composeHomepageContent(content: GenshinPlatformContent | null, now = new Date()) {
  const featured = content ? FEATURED_GENSHIN_IDS.flatMap(id => {
    const character = content.data.characters.find(row => row.id === id);
    return character ? [character] : [];
  }) : [];
  const banners: LiveBanner[] = [...LIVE_BANNERS];
  const codes: LiveCodeSummary[] = [...LIVE_CODE_SUMMARIES];
  const banner = content?.data.guides.find(row => row.id === 'banner-schedule-guide');
  if (banner?.updatedAt) banners.push({ gameId: 'genshin', title: banner.title, summary: banner.summary,
    href: `/genshin/guides/${banner.id}`, status: 'watch', updatedAt: banner.updatedAt, priority: 2 });
  if (content && content.data.codes.length > 0) {
    // Date-only expiry follows the site's UTC+8 calendar, with the expiry day inclusive.
    const today = new Date(now.valueOf() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const revealed = content.data.codes.filter(row => row.revealedAt <= today);
    const active = revealed.filter(row => row.status === 'active' && row.expiresAt >= today).length;
    if (revealed.length > 0) codes.push({ gameId: 'genshin', title: { zh: '原神兑换码', en: 'Genshin Redeem Codes', ja: '原神交換コード' },
      summary: { zh: `当前资料中有 ${active} 个未过期的有效兑换码。`,
        en: `${active} active, unexpired codes in the current data.`, ja: `現在のデータに有効期限内のコードは${active}件です。` },
      href: '/genshin/redeem-codes', status: 'watch',
      updatedAt: revealed.map(row => row.revealedAt).sort().at(-1)!, priority: 1 });
  }
  return { banners, codes, guides: LIVE_GUIDES, versions: LIVE_VERSION_UPDATES, featured,
    genshinUnavailable: content === null, version: content?.version ?? null };
}

export async function getHomepageContent() {
  try {
    return composeHomepageContent(await getGenshinPlatformContent());
  } catch {
    // Keep the platform and other games available without presenting stale Genshin facts.
    return composeHomepageContent(null);
  }
}

export function homepageStatus(gameId: GameId, content: ReturnType<typeof composeHomepageContent>) {
  const items: Array<{ gameId: GameId; priority: number; status?: LiveStatus }> =
    [...content.banners, ...content.versions, ...content.codes, ...content.guides];
  return items.filter(row => row.gameId === gameId).sort((a, b) => a.priority - b.priority)[0]?.status;
}
