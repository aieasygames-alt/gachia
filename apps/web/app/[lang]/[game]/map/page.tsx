import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import {
  genshinRegions,
  getGenshinRegionName,
  getGenshinRegionDescription,
  wuwaRegions,
  getWuWaRegionName,
  getWuWaRegionDescription,
} from '@gachia/data';

const REGION_ICONS: Record<string, string> = {
  mondstadt: '🌬️', liyue: '⛰️', inazuma: '⚡', sumeru: '🌿',
  fontaine: '💧', natlan: '🔥', chasm: '⛏️',
};

export default async function MapPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const gameId = game as GameId;
  const locale = lang as SupportedLocale;
  const gameConfig = GAMES[gameId];

  if (!gameConfig) return null;

  if (gameId === 'wuwa') {
    return <WuWaMapPage locale={locale} />;
  }

  if (gameId !== 'genshin') {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
          {locale === 'zh' ? '地图攻略' : locale === 'ja' ? 'マップ攻略' : 'Map Guide'}
        </h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-game-border text-sm text-game-text-muted">
            {locale === 'zh' ? '敬请期待' : 'Coming Soon'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {locale === 'zh' ? '地图攻略' : locale === 'ja' ? 'マップ攻略' : 'Map Guide'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh'
          ? `共 ${genshinRegions.length} 个区域`
          : locale === 'ja'
          ? `${genshinRegions.length} エリア`
          : `${genshinRegions.length} regions`}
      </p>

      {/* Region stats summary */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-game-border bg-game-surface p-3 text-center">
          <div className="text-lg font-bold text-game-primary">
            {genshinRegions.reduce((s, r) => s + r.teleporters, 0)}
          </div>
          <div className="text-xs text-game-text-muted">
            {locale === 'zh' ? '传送锚点' : locale === 'ja' ? 'ワープポイント' : 'Teleporters'}
          </div>
        </div>
        <div className="rounded-lg border border-game-border bg-game-surface p-3 text-center">
          <div className="text-lg font-bold text-game-primary">
            {genshinRegions.reduce((s, r) => s + r.statues, 0)}
          </div>
          <div className="text-xs text-game-text-muted">
            {locale === 'zh' ? '七天神像' : locale === 'ja' ? '七天神像' : 'Statues of Seven'}
          </div>
        </div>
        <div className="rounded-lg border border-game-border bg-game-surface p-3 text-center">
          <div className="text-lg font-bold text-game-primary">
            {genshinRegions.reduce((s, r) => s + r.oculi, 0)}
          </div>
          <div className="text-xs text-game-text-muted">
            {locale === 'zh' ? '神瞳' : locale === 'ja' ? '神の瞳' : 'Oculi'}
          </div>
        </div>
        <div className="rounded-lg border border-game-border bg-game-surface p-3 text-center">
          <div className="text-lg font-bold text-game-primary">
            {genshinRegions.reduce((s, r) => s + r.domains.length, 0)}
          </div>
          <div className="text-xs text-game-text-muted">
            {locale === 'zh' ? '秘境' : locale === 'ja' ? '秘境' : 'Domains'}
          </div>
        </div>
      </div>

      {/* Region cards */}
      <div className="space-y-6">
        {genshinRegions.map((region) => (
          <div key={region.id} className="rounded-lg border border-game-border bg-game-surface overflow-hidden">
            {/* Header */}
            <div className="border-b border-game-border bg-game-surface-alt px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{REGION_ICONS[region.id] || '🗺️'}</span>
                <div>
                  <h2 className="text-lg font-bold text-game-text">
                    {getGenshinRegionName(region, locale)}
                  </h2>
                  <p className="text-sm text-game-text-muted">
                    {getGenshinRegionDescription(region, locale)}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Exploration stats */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-game-primary">
                    {locale === 'zh' ? '探索统计' : locale === 'ja' ? '探索統計' : 'Exploration Stats'}
                  </h3>
                  <div className="space-y-2">
                    {region.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-game-text">
                        <span className="text-game-primary">•</span>
                        {h}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Specialties */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-game-primary">
                    {locale === 'zh' ? '区域特产' : locale === 'ja' ? '特産品' : 'Local Specialties'}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {region.specialties.map((s) => (
                      <span key={s} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bosses & Domains */}
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-game-primary">
                      {locale === 'zh' ? 'Boss' : 'Bosses'}
                    </h3>
                    <div className="space-y-1">
                      {region.bosses.map((b, i) => (
                        <div key={i} className="text-sm text-game-text">
                          👹 {b}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-game-primary">
                      {locale === 'zh' ? '秘境' : locale === 'ja' ? '秘境' : 'Domains'}
                    </h3>
                    <div className="space-y-1">
                      {region.domains.map((d, i) => (
                        <div key={i} className="text-sm text-game-text">
                          🏛️ {d}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tips */}
              {region.tips.length > 0 && (
                <div className="mt-6 rounded-lg border border-game-border bg-game-surface-alt p-4">
                  <h3 className="mb-2 text-sm font-semibold text-game-primary">
                    💡 {locale === 'zh' ? '探索提示' : locale === 'ja' ? '探索ヒント' : 'Exploration Tips'}
                  </h3>
                  <ul className="space-y-1.5">
                    {region.tips.map((tip, i) => (
                      <li key={i} className="text-sm text-game-text-muted">
                        • {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Wuthering Waves Map ---

const WUWA_REGION_ICONS: Record<string, string> = {
  huanglong: '\u{1F432}',
  'black-shores': '\u{1F311}',
  rinascita: '\u{1F3DB}\u{FE0F}',
  'lahae-roi': '\u{1F30A}',
  'new-federation': '\u{1F306}',
};

function WuWaMapPage({ locale }: { locale: SupportedLocale }) {
  const regions = wuwaRegions;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.wuwa.theme.primary }}>
        {locale === 'zh' ? '地图攻略' : locale === 'ja' ? 'マップ攻略' : 'Map Guide'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${regions.length} 个区域` : locale === 'ja' ? `${regions.length} エリア` : `${regions.length} regions`}
      </p>

      {/* Region stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-game-border bg-game-surface p-3 text-center">
          <div className="text-lg font-bold text-game-primary">
            {regions.reduce((s, r) => s + r.subRegions.length, 0)}
          </div>
          <div className="text-xs text-game-text-muted">
            {locale === 'zh' ? '子区域' : locale === 'ja' ? 'サブエリア' : 'Sub-Regions'}
          </div>
        </div>
        <div className="rounded-lg border border-game-border bg-game-surface p-3 text-center">
          <div className="text-lg font-bold text-game-primary">
            {regions.reduce((s, r) => s + r.bosses.length, 0)}
          </div>
          <div className="text-xs text-game-text-muted">
            {locale === 'zh' ? 'Boss' : 'Bosses'}
          </div>
        </div>
        <div className="rounded-lg border border-game-border bg-game-surface p-3 text-center">
          <div className="text-lg font-bold text-game-primary">
            {regions.reduce((s, r) => s + r.specialties.length, 0)}
          </div>
          <div className="text-xs text-game-text-muted">
            {locale === 'zh' ? '区域特产' : locale === 'ja' ? '特産品' : 'Specialties'}
          </div>
        </div>
        <div className="rounded-lg border border-game-border bg-game-surface p-3 text-center">
          <div className="text-lg font-bold text-game-primary">
            {regions.reduce((s, r) => s + r.domains.length, 0)}
          </div>
          <div className="text-xs text-game-text-muted">
            {locale === 'zh' ? '秘境' : locale === 'ja' ? '秘境' : 'Domains'}
          </div>
        </div>
      </div>

      {/* Region cards */}
      <div className="space-y-6">
        {regions.map((region) => (
          <div key={region.id} className="rounded-lg border border-game-border bg-game-surface overflow-hidden">
            <div className="border-b border-game-border bg-game-surface-alt px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{WUWA_REGION_ICONS[region.id] || '🗺️'}</span>
                <div>
                  <h2 className="text-lg font-bold text-game-text">
                    {getWuWaRegionName(region, locale)}
                  </h2>
                  <p className="text-sm text-game-text-muted">
                    {getWuWaRegionDescription(region, locale)}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid gap-6 lg:grid-cols-3">
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-game-primary">
                    {locale === 'zh' ? '探索要点' : locale === 'ja' ? '探索ポイント' : 'Exploration Highlights'}
                  </h3>
                  <div className="space-y-2">
                    {region.highlights.slice(0, 8).map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-game-text">
                        <span className="text-game-primary">•</span>
                        {h}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-semibold text-game-primary">
                    {locale === 'zh' ? '区域特产' : locale === 'ja' ? '特産品' : 'Local Specialties'}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {region.specialties.map((s) => (
                      <span key={s} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">
                        {s}
                      </span>
                    ))}
                  </div>
                  {region.subRegions.length > 0 && (
                    <div className="mt-4">
                      <h3 className="mb-2 text-sm font-semibold text-game-primary">
                        {locale === 'zh' ? '子区域' : locale === 'ja' ? 'サブエリア' : 'Sub-Regions'}
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {region.subRegions.map((sr) => (
                          <span key={sr} className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">
                            {sr}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {region.bosses.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-game-primary">
                        {locale === 'zh' ? 'Boss' : 'Bosses'}
                      </h3>
                      <div className="space-y-1">
                        {region.bosses.map((b, i) => (
                          <div key={i} className="text-sm text-game-text">
                            👹 {b}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {region.domains.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-game-primary">
                        {locale === 'zh' ? '秘境' : locale === 'ja' ? '秘境' : 'Domains'}
                      </h3>
                      <div className="space-y-1">
                        {region.domains.map((d, i) => (
                          <div key={i} className="text-sm text-game-text">
                            🏛️ {d}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {region.tips.length > 0 && (
                <div className="mt-6 rounded-lg border border-game-border bg-game-surface-alt p-4">
                  <h3 className="mb-2 text-sm font-semibold text-game-primary">
                    💡 {locale === 'zh' ? '探索提示' : locale === 'ja' ? '探索ヒント' : 'Exploration Tips'}
                  </h3>
                  <ul className="space-y-1.5">
                    {region.tips.map((tip, i) => (
                      <li key={i} className="text-sm text-game-text-muted">
                        • {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
