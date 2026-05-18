import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { nteAnomalies, getAnomalyName } from '@gachia/data';
import type { NteAnomaly } from '@gachia/data';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { game } = await params;
  if (game !== 'nte') return { robots: { index: false, follow: false } };
  return {};
}

export default async function AnomaliesPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const gameId = game as GameId;
  const locale = lang as SupportedLocale;
  const gameConfig = GAMES[gameId];

  if (gameId !== 'nte') {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
          {CATEGORY_LABELS.anomalies?.[locale] ?? 'Anomalies'}
        </h1>
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-game-border text-sm text-game-text-muted">
          Coming Soon
        </div>
      </div>
    );
  }

  const all = nteAnomalies;
  const bosses = all.filter((a) => a.type === 'boss');
  const enemies = all.filter((a) => a.type !== 'boss');

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.anomalies?.[locale] ?? 'Anomalies'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${all.length} 个异象` : locale === 'ja' ? `${all.length} 個のアノマリー` : `${all.length} Anomalies`}
      </p>

      {bosses.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            {locale === 'zh' ? 'Boss' : 'Boss'} ({bosses.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {bosses.map((a) => <AnomalyCard key={a.id} a={a} locale={locale} />)}
          </div>
        </section>
      )}

      {enemies.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            {locale === 'zh' ? '精英/普通' : 'Elite / Normal'} ({enemies.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {enemies.map((a) => <AnomalyCard key={a.id} a={a} locale={locale} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function AnomalyCard({ a, locale }: { a: NteAnomaly; locale: SupportedLocale }) {
  const gameConfig = GAMES.nte;
  const name = getAnomalyName(a, locale);
  const isZh = locale === 'zh';

  return (
    <div className="rounded-lg border border-game-border bg-game-surface p-4 transition-colors hover:border-game-primary">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="font-semibold text-game-text">{name}</h3>
        <span className="ml-auto rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">
          {isZh ? a.typeZh : a.type}
        </span>
      </div>
      <div className="mb-2 flex flex-wrap gap-2 text-xs">
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-text-muted">
          {isZh ? a.categoryZh : a.category}
        </span>
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-primary">{a.attributeEn}</span>
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-game-text-muted">HP: {a.hp}</span>
      </div>
      {a.mechanics && (
        <p className="mb-2 text-xs leading-relaxed text-game-text-muted line-clamp-2">
          {isZh ? a.mechanics : a.mechanicsEn}
        </p>
      )}
      {a.drops && (
        <p className="text-xs text-game-primary">
          {isZh ? '掉落' : 'Drops'}: {isZh ? a.drops : a.dropsEn}
        </p>
      )}
    </div>
  );
}
