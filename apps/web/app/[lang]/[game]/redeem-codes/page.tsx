import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { getActiveRedeemCodes as getGenshinActiveRedeemCodes, getRedeemCodeReward as getGenshinRedeemCodeReward } from '@gachia/data/games/genshin/redeem-codes';
import { getActiveRedeemCodes as getStarRailActiveRedeemCodes, getRedeemCodeReward as getStarRailRedeemCodeReward } from '@gachia/data/games/starrail/redeem-codes';
import { getActiveRedeemCodes as getWuWaActiveRedeemCodes, getRedeemCodeReward as getWuWaRedeemCodeReward } from '@gachia/data/games/wuwa/redeem-codes';
import { getActiveRedeemCodes as getZzzActiveRedeemCodes, getRedeemCodeReward as getZzzRedeemCodeReward } from '@gachia/data/games/zzz/redeem-codes';
import { getActiveRedeemCodes as getNteActiveRedeemCodes, getRedeemCodeReward as getNteRedeemCodeReward } from '@gachia/data/games/nte/redeem-codes';
import { getActiveRedeemCodes as getSeaActiveRedeemCodes, getRedeemCodeReward as getSeaRedeemCodeReward } from '@gachia/data/games/sea/redeem-codes';

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

const GAMES_WITH_CODES: GameId[] = ['genshin', 'starrail', 'wuwa', 'zzz', 'nte', 'sea'];

function getCodesForGame(gameId: GameId): CodeItem[] {
  switch (gameId) {
    case 'genshin': return getGenshinActiveRedeemCodes() as unknown as CodeItem[];
    case 'starrail': return getStarRailActiveRedeemCodes() as unknown as CodeItem[];
    case 'wuwa': return getWuWaActiveRedeemCodes() as unknown as CodeItem[];
    case 'zzz': return getZzzActiveRedeemCodes() as unknown as CodeItem[];
    case 'nte': return getNteActiveRedeemCodes() as unknown as CodeItem[];
    case 'sea': return getSeaActiveRedeemCodes() as unknown as CodeItem[];
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
    case 'sea': return getSeaRedeemCodeReward(code as never, locale);
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
    sea: {
      zh: '《遗忘之海》公测开启后，兑换码将通过官方直播、社交账号、活动发放。届时可前往官方兑换页面或游戏内设置→兑换码输入领取奖励。请收藏本页，公测首日将第一时间更新。',
      en: 'After Sea of Remnants launches, redeem codes will be distributed via official livestreams, social accounts, and events. Redeem at the official page or in-game Settings → Redeem Code. Bookmark this page — codes will be updated on launch day.',
      ja: '『シー・オブ・レムナンツ』リリース後、交換コードは公式生放送・SNS・イベントで配布されます。公式交換ページまたはゲーム内の設定→交換コードから入力。リリース当日に更新しますのでブックマークしてください。',
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

      {codes.length === 0 && gameId === 'sea' && (
        <div className="mb-8 rounded-lg border border-game-border bg-game-surface p-6">
          <h2 className="mb-3 text-lg font-semibold text-game-text">
            {locale === 'zh' ? '🎁 公测前夕，兑换码即将开放' : locale === 'ja' ? '🎁 リリース直前、交換コードは近日公開' : '🎁 Pre-launch — codes coming soon'}
          </h2>
          <p className="mb-3 text-sm text-game-text-muted">
            {locale === 'zh'
              ? '《遗忘之海》定档 2026 年 7 月公测。开服前后将通过以下渠道发放兑换码：'
              : locale === 'ja'
              ? '『シー・オブ・レムナンツ』は 2026 年 7 月リリース予定。前後のタイミングで以下のルートで交換コードが配布されます：'
              : "Sea of Remnants launches in July 2026. Codes will be distributed through these channels around launch:"}
          </p>
          <ul className="mb-3 space-y-1 text-sm text-game-text-muted">
            <li>{locale === 'zh' ? '• 官方前瞻直播（通常每个版本 3-5 个永久码）' : locale === 'ja' ? '• 公式生放送（通常バージョンごとに 3-5 個の恒常コード）' : '• Official livestreams (typically 3-5 permanent codes per version)'}</li>
            <li>{locale === 'zh' ? '• 公测预约里程碑奖励（预约人数达标解锁）' : locale === 'ja' ? '• 事前登録マイルストーン報酬' : '• Pre-registration milestone rewards'}</li>
            <li>{locale === 'zh' ? '• 官方社交账号（微博/B站/微信公众号）' : locale === 'ja' ? '• 公式SNS（Weibo/Bilibili/WeChat）' : '• Official social accounts (Weibo/Bilibili/WeChat)'}</li>
            <li>{locale === 'zh' ? '• 游戏媒体合作活动（4399/游民/17173 等）' : locale === 'ja' ? '• ゲームメディア提携イベント' : '• Game media partnership events'}</li>
          </ul>
          <p className="text-xs text-game-text-muted">
            {locale === 'zh'
              ? '建议收藏本页，公测首日（通常 10:00 开服后 1 小时内）我们将第一时间更新所有公开兑换码。'
              : locale === 'ja'
              ? 'このページをブックマークしてください。リリース当日（通常 10:00 開服後 1 時間以内）に全コードを即時更新します。'
              : 'Bookmark this page — on launch day (usually within 1 hour of 10:00 server opening), we will update all public codes immediately.'}
          </p>
        </div>
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
