import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { getActiveRedeemCodes as getGenshinActiveRedeemCodes, getRedeemCodeReward as getGenshinRedeemCodeReward } from '@gachia/data/games/genshin/redeem-codes';
import { getActiveRedeemCodes as getStarRailActiveRedeemCodes, getRedeemCodeReward as getStarRailRedeemCodeReward } from '@gachia/data/games/starrail/redeem-codes';
import { getActiveRedeemCodes as getWuWaActiveRedeemCodes, getRedeemCodeReward as getWuWaRedeemCodeReward } from '@gachia/data/games/wuwa/redeem-codes';
import { getActiveRedeemCodes as getZzzActiveRedeemCodes, getRedeemCodeReward as getZzzRedeemCodeReward } from '@gachia/data/games/zzz/redeem-codes';
import { getActiveRedeemCodes as getNteActiveRedeemCodes, getRedeemCodeReward as getNteRedeemCodeReward } from '@gachia/data/games/nte/redeem-codes';
import { getActiveRedeemCodes as getSeaActiveRedeemCodes, getRedeemCodeReward as getSeaRedeemCodeReward } from '@gachia/data/games/sea/redeem-codes';
import { getActiveRedeemCodes as getSkjhActiveRedeemCodes, getRedeemCodeReward as getSkjhRedeemCodeReward } from '@gachia/data/games/skjh/redeem-codes';

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

const GAMES_WITH_CODES: GameId[] = ['genshin', 'starrail', 'wuwa', 'zzz', 'nte', 'sea', 'skjh'];

const REDEEM_DESC: Partial<Record<GameId, Record<SupportedLocale, string>>> = {
  genshin: {
    zh: '原神兑换码大全，整理前瞻直播、活动福利、永久码和领取方法，帮助你快速查看当前可用礼包并及时兑换原石、经验书和摩拉。',
    en: 'Genshin Impact redeem code tracker covering livestream codes, event rewards, permanent codes, and redemption steps so you can claim Primogems and resources quickly.',
    ja: '原神の交換コード一覧。生放送コード、イベント報酬、恒常コード、受け取り方法を整理し、原石や育成素材を素早く回収できます。',
  },
  starrail: {
    zh: '崩坏：星穹铁道兑换码大全，追踪前瞻直播、活动奖励、长期有效码和领取入口，方便你第一时间兑换星琼和养成资源。',
    en: 'Honkai: Star Rail redeem code tracker covering livestream codes, event rewards, permanent codes, and redemption steps so you can claim Stellar Jade and materials fast.',
    ja: 'スターレイルの交換コード一覧。生放送コード、イベント報酬、恒常コード、受け取り方法をまとめて確認できます。',
  },
  wuwa: {
    zh: '鸣潮兑换码大全，汇总前瞻直播、活动福利、长期兑换码和领取方式，帮助你快速兑换星声、材料和其他开荒资源。',
    en: 'Wuthering Waves redeem code tracker covering livestream codes, event rewards, permanent codes, and redemption steps so you can claim Astrite and resources quickly.',
    ja: '鳴潮の交換コード一覧。生放送コード、イベント報酬、恒常コード、受け取り方法を整理しています。',
  },
  zzz: {
    zh: '绝区零兑换码大全，整理前瞻直播、活动福利、长期有效码和领取方法，帮助你快速兑换菲林、材料和开服资源。',
    en: 'Zenless Zone Zero redeem code tracker covering livestream codes, event rewards, permanent codes, and redemption steps so you can claim Polychromes and materials quickly.',
    ja: 'ゼンレスゾーンゼロの交換コード一覧。生放送コード、イベント報酬、恒常コード、受け取り方法をまとめています。',
  },
  nte: {
    zh: '异环兑换码大全，追踪官方直播、预约奖励、活动福利和可用礼包码，帮助你在开服和后续版本第一时间领取资源。',
    en: 'Neverness to Everness redeem code tracker covering official livestreams, reservation rewards, event bonuses, and active gift codes so you can claim launch resources fast.',
    ja: '異環の交換コード一覧。公式生放送、事前登録報酬、イベント特典、有効コードを整理しています。',
  },
  sea: {
    zh: '遗忘之海兑换码大全，追踪公测直播、预约奖励、活动福利和后续礼包码，方便你在开服和版本更新时第一时间领取资源。',
    en: 'Sea of Remnants redeem code tracker covering livestreams, reservation rewards, event bonuses, and upcoming launch codes so you can claim rewards on day one.',
    ja: 'シー・オブ・レムナンツの交換コード一覧。生放送、事前登録報酬、イベント特典を整理しています。',
  },
  skjh: {
    zh: '失控进化兑换码大全，追踪官网、WeGame、B站、微信公众号、TapTap、公测礼包、预约奖励和开服活动码，方便你及时领取福利。',
    en: 'Ashfall Evolution redeem code tracker covering official site, WeGame, Bilibili, WeChat, TapTap, launch gifts, reservation rewards, and event codes.',
    ja: '失控進化の交換コード一覧。公式サイト、WeGame、Bilibili、WeChat、TapTap、リリース特典を整理しています。',
  },
};

function getCodesForGame(gameId: GameId): CodeItem[] {
  switch (gameId) {
    case 'genshin': return getGenshinActiveRedeemCodes() as unknown as CodeItem[];
    case 'starrail': return getStarRailActiveRedeemCodes() as unknown as CodeItem[];
    case 'wuwa': return getWuWaActiveRedeemCodes() as unknown as CodeItem[];
    case 'zzz': return getZzzActiveRedeemCodes() as unknown as CodeItem[];
    case 'nte': return getNteActiveRedeemCodes() as unknown as CodeItem[];
    case 'sea': return getSeaActiveRedeemCodes() as unknown as CodeItem[];
    case 'skjh': return getSkjhActiveRedeemCodes() as unknown as CodeItem[];
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
    case 'skjh': return getSkjhRedeemCodeReward(code as never, locale);
    default: return code.rewardEn;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  if (!GAMES_WITH_CODES.includes(gameId)) return { robots: { index: false, follow: false } };
  const title = locale === 'zh'
    ? `${GAMES[gameId].name.zh}兑换码大全｜最新礼包码与领取方法`
    : locale === 'ja'
      ? `${GAMES[gameId].name.ja ?? GAMES[gameId].name.en} 交換コード一覧｜最新特典と受け取り方法`
      : `${GAMES[gameId].name.en} Redeem Codes, Gift Codes & Rewards`;
  const description = REDEEM_DESC[gameId]?.[locale] ?? REDEEM_DESC[gameId]?.en ?? '';
  return {
    title,
    description,
    alternates: { canonical: `https://gachia.com/${locale}/${gameId}/redeem-codes` },
  };
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
    skjh: {
      zh: '《失控进化》公测兑换码暂未公开。上线前后请关注官网、WeGame、B站、微信公众号、TapTap 与本页更新；已确认的预约和绑定奖励会通过游戏邮箱或活动规则发放。',
      en: 'Ashfall Evolution launch redeem codes are not public yet. Watch the official site, WeGame, Bilibili, WeChat, TapTap, and this page. Confirmed reservation and binding rewards should follow official event rules.',
      ja: '『失控進化』のリリース交換コードはまだ公開されていません。公式サイト、WeGame、Bilibili、WeChat、TapTap、本ページを確認してください。',
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

      {codes.length === 0 && gameId === 'skjh' && (
        <SkjhRedeemHub locale={locale} />
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

function SkjhRedeemHub({ locale }: { locale: SupportedLocale }) {
  const t = (zh: string, en: string, ja?: string) => locale === 'zh' ? zh : locale === 'ja' ? (ja ?? en) : en;
  const channels = [
    ['官网公告', 'Official site', '公式サイト'],
    ['WeGame', 'WeGame', 'WeGame'],
    ['B站', 'Bilibili', 'Bilibili'],
    ['微信公众号', 'WeChat Official Account', 'WeChat公式'],
    ['TapTap', 'TapTap', 'TapTap'],
    ['媒体合作活动', 'Media campaigns', 'メディア連携'],
  ] as const;
  const confirmedRewards = [
    ['个人预约', '登岛行动·M39步枪外观、渗透者·头像、贡献点×388', 'Personal reservation', 'M39 rifle skin, avatar, Contribution Points x388'],
    ['手机号绑定', '贡献点×188', 'Phone binding', 'Contribution Points x188'],
    ['4000万预约里程碑', '登岛行动·步枪外观等全档奖励', '40M milestone', 'Landing Operation rifle skin and all previous tiers'],
    ['S1 活动', '登岛淘金、大铁球挑战、渗透补给等奖励待上线核验', 'S1 events', 'Landing Gold Rush, Big Iron Ball Challenge, Infiltration Supply rewards to verify at launch'],
  ] as const;
  const updateRows = [
    ['2026-07-05', '兑换码未公开，已建立追踪页', 'No public codes yet; tracking page prepared'],
    ['2026-07-09', '开服后优先核验官网、邮箱、活动中心和平台礼包', 'Verify official site, mailbox, event center, and platform packs after launch'],
    ['开服首周', '每日追踪新增礼包码、过期码和活动入口', 'Track new codes, expired codes, and event entries daily during launch week'],
  ] as const;

  return (
    <div className="mb-8 space-y-6">
      <section className="rounded-lg border border-game-border bg-game-surface p-6">
        <h2 className="mb-3 text-lg font-semibold text-game-text">
          {t('失控进化兑换码状态', 'Ashfall Evolution Code Status', '失控進化コード状況')}
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-game-text-muted">
          {t(
            '截至 2026 年 7 月 5 日，公测通用兑换码暂未公开。当前已确认的是预约、绑定、4000 万里程碑、开服登录和 S1 活动奖励。本站会在 7 月 9 日开服后优先核验官网、WeGame、B站、微信公众号、TapTap 和游戏内活动中心。',
            'As of July 5, 2026, no public universal launch code has been confirmed. Confirmed rewards are reservation, binding, 40M milestone, launch login, and S1 event rewards. This page will verify the official site, WeGame, Bilibili, WeChat, TapTap, and the in-game event center after launch.',
            '2026年7月5日時点で、汎用リリースコードは未公開です。事前登録、連携、4000万マイルストーン、ログイン、S1イベント報酬を追跡します。'
          )}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded bg-game-surface-alt p-3">
            <div className="text-xs text-game-text-muted">{t('当前有效码', 'Active Codes', '有効コード')}</div>
            <div className="mt-1 text-xl font-bold text-game-primary">0</div>
          </div>
          <div className="rounded bg-game-surface-alt p-3">
            <div className="text-xs text-game-text-muted">{t('待核验来源', 'Sources to Check', '確認元')}</div>
            <div className="mt-1 text-xl font-bold text-game-primary">{channels.length}</div>
          </div>
          <div className="rounded bg-game-surface-alt p-3">
            <div className="text-xs text-game-text-muted">{t('下一次重点更新', 'Next Priority Update', '次回重点更新')}</div>
            <div className="mt-1 text-sm font-semibold text-game-text">2026-07-09</div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-game-border bg-game-surface p-6">
        <h2 className="mb-3 text-lg font-semibold text-game-text">{t('领取步骤', 'How to Claim', '受取手順')}</h2>
        <ol className="space-y-2 text-sm text-game-text-muted">
          <li>{t('1. 开服后先进入游戏邮箱，领取预约、绑定和里程碑奖励。', '1. After launch, check the in-game mailbox for reservation, binding, and milestone rewards.', '1. リリース後、ゲーム内メールで報酬を確認。')}</li>
          <li>{t('2. 打开活动中心，检查开服登录、S1 活动和平台礼包入口。', '2. Open the event center and check login, S1, and platform pack entries.', '2. イベントセンターでログイン、S1、プラットフォーム報酬を確認。')}</li>
          <li>{t('3. 若官方发布兑换码，再按游戏内设置或活动页提示输入。', '3. If official codes are released, redeem them through in-game settings or the event page instructions.', '3. 公式コードが公開されたらゲーム内設定またはイベントページで入力。')}</li>
        </ol>
      </section>

      <section className="rounded-lg border border-game-border bg-game-surface p-6">
        <h2 className="mb-3 text-lg font-semibold text-game-text">{t('已确认福利', 'Confirmed Rewards', '確認済み報酬')}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {confirmedRewards.map(([zhName, zhReward, enName, enReward]) => (
            <div key={zhName} className="rounded bg-game-surface-alt p-3">
              <div className="text-sm font-semibold text-game-text">{locale === 'zh' ? zhName : enName}</div>
              <div className="mt-1 text-xs leading-relaxed text-game-text-muted">{locale === 'zh' ? zhReward : enReward}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-game-border bg-game-surface p-6">
        <h2 className="mb-3 text-lg font-semibold text-game-text">{t('追踪来源', 'Tracked Sources', '追跡元')}</h2>
        <div className="flex flex-wrap gap-2">
          {channels.map(([zh, en, ja]) => (
            <span key={zh} className="rounded bg-game-surface-alt px-3 py-1.5 text-sm text-game-text">
              {locale === 'zh' ? zh : locale === 'ja' ? ja : en}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-game-border bg-game-surface p-6">
        <h2 className="mb-3 text-lg font-semibold text-game-text">{t('更新日志', 'Update Log', '更新履歴')}</h2>
        <div className="space-y-2">
          {updateRows.map(([date, zh, en]) => (
            <div key={date} className="flex gap-3 rounded bg-game-surface-alt p-3 text-sm">
              <span className="w-24 shrink-0 font-mono text-game-primary">{date}</span>
              <span className="text-game-text-muted">{locale === 'zh' ? zh : en}</span>
            </div>
          ))}
        </div>
      </section>
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
