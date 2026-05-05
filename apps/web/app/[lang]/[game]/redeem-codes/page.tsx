import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { getActiveRedeemCodes, getRedeemCodeReward } from '@gachia/data';

export default async function RedeemCodesPage({
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
          {CATEGORY_LABELS['redeem-codes']?.[locale] ?? 'Redeem Codes'}
        </h1>
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-game-border text-sm text-game-text-muted">
          Coming Soon
        </div>
      </div>
    );
  }

  const codes = getActiveRedeemCodes();
  const cnCodes = codes.filter((c) => c.region === 'cn');
  const globalCodes = codes.filter((c) => c.region === 'global');

  const sourceLabels: Record<string, Record<string, string>> = {
    livestream: { zh: '前瞻直播', en: 'Livestream', ja: '生放送' },
    launch: { zh: '公测福利', en: 'Launch Bonus', ja: 'リリース特典' },
    event: { zh: '活动', en: 'Event', ja: 'イベント' },
  };

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS['redeem-codes']?.[locale] ?? 'Redeem Codes'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${codes.length} 个有效兑换码` : locale === 'ja' ? `${codes.length} 個の有効なコード` : `${codes.length} active codes`}
      </p>

      {cnCodes.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            {locale === 'zh' ? '国服' : locale === 'ja' ? '中国サーバー' : 'CN Server'} ({cnCodes.length})
          </h2>
          <div className="space-y-3">
            {cnCodes.map((code) => (
              <CodeCard key={code.code} code={code} locale={locale} sourceLabels={sourceLabels} />
            ))}
          </div>
        </section>
      )}

      {globalCodes.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            {locale === 'zh' ? '国际服' : locale === 'ja' ? 'グローバルサーバー' : 'Global Server'} ({globalCodes.length})
          </h2>
          <div className="space-y-3">
            {globalCodes.map((code) => (
              <CodeCard key={code.code} code={code} locale={locale} sourceLabels={sourceLabels} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CodeCard({ code, locale, sourceLabels }: { code: ReturnType<typeof getActiveRedeemCodes>[number]; locale: SupportedLocale; sourceLabels: Record<string, Record<string, string>> }) {
  const expired = code.expiresAt && new Date(code.expiresAt) < new Date();
  const sourceLabel = sourceLabels[code.source]?.[locale] ?? code.source;

  return (
    <div className={`rounded-lg border bg-game-surface p-4 ${expired ? 'border-game-border/50 opacity-60' : 'border-game-border'}`}>
      <div className="mb-2 flex items-center gap-3">
        <code className="rounded bg-game-surface-alt px-3 py-1 text-sm font-mono font-bold text-game-primary select-all">{code.code}</code>
        {expired ? (
          <span className="rounded bg-red-900/30 px-2 py-0.5 text-xs text-red-400">{locale === 'zh' ? '已过期' : 'Expired'}</span>
        ) : (
          <span className="rounded bg-green-900/30 px-2 py-0.5 text-xs text-green-400">{locale === 'zh' ? '有效' : 'Active'}</span>
        )}
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{sourceLabel}</span>
      </div>
      <p className="text-sm text-game-text-muted">{getRedeemCodeReward(code, locale)}</p>
      {code.expiresAt && (
        <p className="mt-1 text-xs text-game-text-muted">
          {locale === 'zh' ? `有效期至 ${code.expiresAt}` : locale === 'ja' ? `期限: ${code.expiresAt}` : `Expires: ${code.expiresAt}`}
        </p>
      )}
    </div>
  );
}
