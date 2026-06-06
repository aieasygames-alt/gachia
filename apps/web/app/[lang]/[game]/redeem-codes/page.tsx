import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import {
  getActiveRedeemCodes as getNteActiveRedeemCodes,
  getRedeemCodeReward as getNteRedeemCodeReward,
  getGenshinActiveRedeemCodes,
  getGenshinRedeemCodeReward,
  getStarRailActiveRedeemCodes,
  getStarRailRedeemCodeReward,
  getZzzActiveRedeemCodes,
  getZzzRedeemCodeReward,
  getWuWaActiveRedeemCodes,
  getWuWaRedeemCodeReward,
} from '@gachia/data';

interface CodeItem {
  code: string;
  reward: string;
  rewardEn: string;
  status: string;
  expiresAt: string;
  source: string;
  region: string;
  revealedAt: string;
}

const GAMES_WITH_CODES: GameId[] = ['genshin', 'starrail', 'wuwa', 'zzz', 'nte'];

function getCodesForGame(gameId: GameId): CodeItem[] {
  switch (gameId) {
    case 'genshin': return getGenshinActiveRedeemCodes() as unknown as CodeItem[];
    case 'starrail': return getStarRailActiveRedeemCodes() as unknown as CodeItem[];
    case 'wuwa': return getWuWaActiveRedeemCodes() as unknown as CodeItem[];
    case 'zzz': return getZzzActiveRedeemCodes() as unknown as CodeItem[];
    case 'nte': return getNteActiveRedeemCodes() as unknown as CodeItem[];
    default: return [];
  }
}

function getRewardText(gameId: GameId, code: CodeItem, locale: SupportedLocale): string {
  switch (gameId) {
    case 'genshin': return getGenshinRedeemCodeReward(code as never, locale);
    case 'starrail': return getStarRailRedeemCodeReward(code as never, locale);
    case 'wuwa': return getWuWaRedeemCodeReward(code as never, locale);
    case 'zzz': return getZzzRedeemCodeReward(code as never, locale);
    case 'nte': return getNteRedeemCodeReward(code as never, locale);
    default: return code.rewardEn;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { game } = await params;
  const gameId = game as GameId;
  if (!GAMES_WITH_CODES.includes(gameId)) return { robots: { index: false, follow: false } };
  return {};
}

export default async function RedeemCodesPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const gameId = game as GameId;
  const locale = lang as SupportedLocale;
  const gameConfig = GAMES[gameId];

  if (!GAMES_WITH_CODES.includes(gameId)) {
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

  const codes = getCodesForGame(gameId);
  const cnCodes = codes.filter((c) => c.region === 'cn');
  const globalCodes = codes.filter((c) => c.region === 'global');

  const sourceLabels: Record<string, Record<string, string>> = {
    livestream: { zh: '前瞻直播', en: 'Livestream', ja: '生放送' },
    launch: { zh: '公测福利', en: 'Launch Bonus', ja: 'リリース特典' },
    event: { zh: '活动', en: 'Event', ja: 'イベント' },
    permanent: { zh: '永久', en: 'Permanent', ja: '恒常' },
  };

  const redeemInstructions: Record<string, Record<string, string>> = {
    genshin: {
      zh: '前往官方兑换页面或游戏内设置→账户→兑换码，输入兑换码即可领取奖励。需冒险等级10+。',
      en: 'Go to the official redemption page or in-game Settings → Account → Redeem Code. Requires AR 10+.',
      ja: '公式交換ページまたはゲーム内の設定→アカウント→コード交換から入力。冒険ランク10以上が必要。',
    },
    starrail: {
      zh: '前往官方兑换页面或游戏内手机→设置→兑换码，输入兑换码领取奖励。',
      en: 'Visit the official redemption page or in-game Phone → Settings → Redemption Code to claim rewards.',
      ja: '公式交換ページまたはゲーム内の携帯→設定→交換コードから入力して報酬を受け取ります。',
    },
    zzz: {
      zh: '前往官方兑换页面或游戏内设置→其他→兑换码，输入兑换码领取奖励。',
      en: 'Go to the official redemption page or in-game Settings → Other → Redeem Code to claim rewards.',
      ja: '公式交換ページまたはゲーム内の設定→その他→交換コードから入力して報酬を受け取ります。',
    },
    nte: {
      zh: '前往官方兑换页面或游戏内设置→兑换码，输入兑换码领取奖励。',
      en: 'Visit the official redemption page or in-game Settings → Redeem Code to claim rewards.',
      ja: '公式交換ページまたはゲーム内の設定→交換コードから入力して報酬を受け取ります。',
    },
    wuwa: {
      zh: '前往官方兑换页面或游戏内设置→其他→兑换码，输入兑换码领取奖励。',
      en: 'Go to the official redemption page or in-game Settings → Other → Redeem Code to claim rewards.',
      ja: '公式交換ページまたはゲーム内の設定→その他→交換コードから入力して報酬を受け取ります。',
    },
  };

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS['redeem-codes']?.[locale] ?? 'Redeem Codes'}
      </h1>
      <p className="mb-2 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${codes.length} 个有效兑换码` : locale === 'ja' ? `${codes.length} 個の有効なコード` : `${codes.length} active codes`}
      </p>
      {redeemInstructions[gameId] && (
        <p className="mb-6 text-xs text-game-text-muted">
          {redeemInstructions[gameId][locale] ?? redeemInstructions[gameId]['en']}
        </p>
      )}

      {cnCodes.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            {locale === 'zh' ? '国服' : locale === 'ja' ? '中国サーバー' : 'CN Server'} ({cnCodes.length})
          </h2>
          <div className="space-y-3">
            {cnCodes.map((code) => (
              <CodeCard key={code.code} gameId={gameId} code={code} locale={locale} sourceLabels={sourceLabels} />
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
              <CodeCard key={code.code} gameId={gameId} code={code} locale={locale} sourceLabels={sourceLabels} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CodeCard({ gameId, code, locale, sourceLabels }: { gameId: GameId; code: CodeItem; locale: SupportedLocale; sourceLabels: Record<string, Record<string, string>> }) {
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
      <p className="text-sm text-game-text-muted">{getRewardText(gameId, code, locale)}</p>
      {code.expiresAt && (
        <p className="mt-1 text-xs text-game-text-muted">
          {locale === 'zh' ? `有效期至 ${code.expiresAt}` : locale === 'ja' ? `期限: ${code.expiresAt}` : `Expires: ${code.expiresAt}`}
        </p>
      )}
    </div>
  );
}
