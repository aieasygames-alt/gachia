import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { getRedeemCodeReward, getRedeemCodesForGame, GAMES_WITH_REDEEM_CODES } from '@/lib/game-data/redeem-codes';
import type { RedeemCodeEntry } from '@/lib/game-data/redeem-codes';
import { isRedeemCodeActive } from '@/lib/redeem-codes';

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
  roco: {
    zh: 'Roco Kingdom 国际服兑换码与 CBT 奖励追踪，区分暂无公开兑换码、CBT 报名奖励、预约奖励和上线后需要核验的兑换入口。',
    en: 'Roco Kingdom global code and CBT reward tracker separating no confirmed public codes from CBT signup rewards, pre-registration rewards, and launch verification.',
    ja: 'ロコキングダム国際版のコードとCBT報酬を追跡。公開コード未確認、CBT応募報酬、事前登録、リリース後確認を分けて整理します。',
  },
  'roco-cn': {
    zh: '《洛克王国：世界》国服兑换码大全，整理公测长期码、S2 赛季码、主播码、渠道码与限时口令，帮助小洛克及时领取洛克钻、咕噜球与经验果。',
    en: 'Roco Kingdom (CN) redeem code tracker covering launch codes, S2 season codes, creator codes, channel codes, and limited-time passwords so you can claim Luoke Diamonds and resources fast.',
    ja: 'ロコキングダム（中国版）の交換コード一覧。公測の恒常コード、S2シーズンコード、クリエイターコード、期間限定パスワードを整理しています。',
  },
  aniimo: {
    zh: '伊莫兑换码与奖励追踪，区分暂无官方兑换码、预注册奖励、里程碑奖励和上线后需要核验的兑换入口。',
    en: 'Aniimo code and reward tracker separating no confirmed public codes from pre-registration rewards, milestone rewards, and launch verification.',
    ja: 'アニモのコードと報酬を追跡。公式コード未確認、事前登録報酬、マイルストーン報酬、リリース後確認を分けて整理します。',
  },
};

function getLastCheckedAt(codes: RedeemCodeEntry[]): string {
  const latestReveal = codes
    .map((code) => code.revealedAt)
    .filter(Boolean)
    .sort()
    .at(-1);
  return latestReveal ?? '2026-07-26';
}

function formatDateLabel(date: string, locale: SupportedLocale): string {
  if (!date || date === 'permanent') {
    return locale === 'zh' ? '永久有效' : locale === 'ja' ? '恒常' : 'Permanent';
  }
  const parsedDate = date.includes('T') ? new Date(date) : new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsedDate);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  if (!GAMES_WITH_REDEEM_CODES.includes(gameId)) return { robots: { index: false, follow: false } };
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

  if (!GAMES_WITH_REDEEM_CODES.includes(gameId)) {
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

  const codes = await getRedeemCodesForGame(gameId);
  const activeCodes = codes.filter((code) => isRedeemCodeActive(code));
  const expiredCodes = codes.filter((code) => !isRedeemCodeActive(code));
  const lastCheckedAt = getLastCheckedAt(codes);
  const isOfficialWatchlist = (gameId === 'aniimo' && activeCodes.length === 0 && codes.some((code) => code.status === 'Watchlist'))
    || (gameId === 'zzz' && codes.some((code) => code.status === 'watchlist' && code.source === 'official-watchlist'));

  const sourceLabels: Record<string, Record<string, string>> = {
    livestream: { zh: '前瞻直播', en: 'Livestream', ja: '生放送' },
    launch: { zh: '公测福利', en: 'Launch Bonus', ja: 'リリース特典' },
    event: { zh: '活动', en: 'Event', ja: 'イベント' },
    permanent: { zh: '永久', en: 'Permanent', ja: '恒常' },
    '公测长期码': { zh: '公测长期码', en: 'Launch (permanent)', ja: '公測・恒常' },
    '公测纪念码': { zh: '公测纪念码', en: 'Launch Commemorative', ja: '公測記念' },
    '公测纪念口令': { zh: '公测纪念口令', en: 'Launch Password', ja: '公測記念パスワード' },
    '通用礼包码': { zh: '通用礼包码', en: 'General Gift Code', ja: '汎用ギフトコード' },
    'S2 赛季码': { zh: 'S2 赛季码', en: 'S2 Season', ja: 'S2シーズン' },
    '主播长期码': { zh: '主播长期码', en: 'Creator (permanent)', ja: 'クリエイター・恒常' },
    'VIVO 渠道码': { zh: 'VIVO 渠道码', en: 'VIVO Channel', ja: 'VIVOチャンネル' },
    '8 月限时码': { zh: '8 月限时码', en: 'August Limited', ja: '8月期間限定' },
    '赛事预热码': { zh: '赛事预热码', en: 'Tournament Promo', ja: '大会プロモ' },
    'official-watchlist': { zh: '官方观察', en: 'Official watchlist', ja: '公式確認待ち' },
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
    roco: {
      zh: 'Roco Kingdom 国际服目前没有已确认公开兑换码。CBT 报名、预约奖励、资格邮件和上线后兑换入口以官网、官方邮件和平台商店为准。',
      en: 'Roco Kingdom global has no confirmed public redeem code yet. CBT signup, pre-registration rewards, eligibility mail, and launch redemption flow follow the official site, official emails, and platform stores.',
      ja: 'ロコキングダム国際版の公開交換コードはまだ確認されていません。CBT応募、事前登録報酬、資格メール、交換入口は公式サイト、公式メール、ストア基準です。',
    },
    'roco-cn': {
      zh: '进入游戏主界面点击左下角齿轮（设置）→ 用户 → 兑换码，完整输入口令后提交，奖励发放至游戏邮箱。所有码单账号限兑一次、区分大小写，限时码会过期，请及时兑换。',
      en: 'In the main menu, open the gear (Settings) in the bottom-left corner → User tab → Redeem Code, paste the code exactly, and submit. Rewards arrive in the mailbox. Each code works once per account and is case-sensitive; time-limited codes expire.',
      ja: 'ゲームのメインメニュー左下の歯車（設定）→ ユーザー → 交換コードからコードを正確に入力して送信。報酬はメールボックスに届きます。各コードはアカウントごとに1回のみ、大文字小文字は区別されます。期間限定コードは期限切れに注意。',
    },
    aniimo: {
      zh: '伊莫目前没有确认的公开兑换码。预注册奖励、里程碑奖励和上线活动奖励会单独追踪；正式兑换入口以上线后游戏内或官方公告为准。',
      en: 'Aniimo has no confirmed public redeem code yet. Pre-registration, milestone, and launch event rewards are tracked separately; final redemption steps depend on the live client or official notices.',
      ja: 'アニモの公開交換コードはまだ確認されていません。事前登録、マイルストーン、リリースイベント報酬は別で追跡します。',
    },
  };

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS['redeem-codes']?.[locale] ?? 'Redeem Codes'}
      </h1>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-game-border bg-game-surface p-3">
          <div className="text-xs text-game-text-muted">
            {isOfficialWatchlist && gameId === 'aniimo'
              ? (locale === 'zh' ? '官方公开码' : locale === 'ja' ? '公式公開コード' : 'Official Public Codes')
              : (locale === 'zh' ? '当前有效码' : locale === 'ja' ? '有効コード' : 'Active Codes')}
          </div>
          <div className="mt-1 text-2xl font-bold text-game-primary">
            {isOfficialWatchlist && gameId === 'aniimo' ? (locale === 'zh' ? '暂无确认' : locale === 'ja' ? '未確認' : 'None confirmed') : activeCodes.length}
          </div>
        </div>
        <div className="rounded-lg border border-game-border bg-game-surface p-3">
          <div className="text-xs text-game-text-muted">
            {locale === 'zh' ? '已过期/待复核' : locale === 'ja' ? '期限切れ/要確認' : 'Expired / To Recheck'}
          </div>
          <div className="mt-1 text-2xl font-bold text-game-text">{expiredCodes.length}</div>
        </div>
        <div className="rounded-lg border border-game-border bg-game-surface p-3">
          <div className="text-xs text-game-text-muted">
            {locale === 'zh' ? '最后核验' : locale === 'ja' ? '最終確認' : 'Last Checked'}
          </div>
          <div className="mt-1 text-sm font-semibold text-game-text">
            {formatDateLabel(lastCheckedAt, locale)}
          </div>
        </div>
      </div>
      {redeemInstructions[gameId] && (
        <p className="mb-6 text-xs text-game-text-muted">
          {redeemInstructions[gameId][locale] ?? redeemInstructions[gameId]['en']}
        </p>
      )}
      {isOfficialWatchlist && gameId === 'aniimo' && (
        <div className="mb-8 rounded-lg border border-game-border bg-game-surface p-4 text-sm text-game-text-muted">
          <h2 className="mb-2 font-semibold text-game-text">
            {locale === 'zh' ? '当前结论：暂无已确认公开兑换码' : locale === 'ja' ? '現在の結論：確認済みの公開交換コードはありません' : 'Current answer: no public redeem code is confirmed'}
          </h2>
          <p>
            {locale === 'zh'
              ? '预注册、里程碑和上线活动奖励不等于可输入的兑换码。只有官方公告或游戏内兑换入口可核验时，才会在本页标记为有效。'
              : locale === 'ja'
                ? '事前登録、マイルストーン、リリースイベント報酬は、入力できる交換コードとは別です。公式告知またはゲーム内交換画面で確認できた場合のみ、有効として掲載します。'
                : 'Pre-registration, milestone, and launch-event rewards are not automatically redeemable codes. A code is marked active only after it can be verified in an official notice or the live client.'}
          </p>
        </div>
      )}

      {gameId === 'zzz' && codes.some((code) => code.status === 'watchlist' && code.source === 'official-watchlist') && (
        <div className="mb-8 rounded-lg border border-game-primary/40 bg-game-surface p-4 text-sm text-game-text-muted">
          <h2 className="mb-2 font-semibold text-game-text">
            {locale === 'zh' ? '3.3 直播码：等待官方公布' : locale === 'ja' ? 'v3.3配信コード：公式発表待ち' : 'v3.3 livestream codes: awaiting official publication'}
          </h2>
          <p>
            {locale === 'zh'
              ? '3.3「重返天空的旅程」前瞻特别节目将于 2026 年 10 月 9 日 19:30（UTC+8）播出。节目开始后，本页只会将官方可验证的代码标记为有效；不要输入社区转述或未核验字符串。'
              : locale === 'ja'
                ? 'v3.3「空へ戻る旅」特別番組は2026年10月9日19:30（UTC+8）です。番組開始後、本ページでは公式に確認できたコードのみ有効として掲載します。未確認の文字列は入力しないでください。'
                : 'The v3.3 “Journey Back to the Sky” special program airs on October 9, 2026 at 19:30 (UTC+8). After it begins, this page will mark only officially verifiable codes as active. Do not enter community reposts or unverified strings.'}
          </p>
        </div>
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

      {codes.length === 0 && gameId === 'roco' && (
        <RocoRedeemHub locale={locale} />
      )}

      {gameId === 'aniimo' && (
        <AniimoRedeemHub locale={locale} />
      )}

      {gameId !== 'aniimo' && !(codes.length === 0 && (gameId === 'skjh' || gameId === 'roco')) && (
        <>
          <CodeSection
            title={locale === 'zh' ? '有效兑换码' : locale === 'ja' ? '有効な交換コード' : 'Active Redeem Codes'}
            emptyText={locale === 'zh' ? '当前没有已确认有效的兑换码。请先查看下方过期/待复核列表，并关注本页更新。' : locale === 'ja' ? '現在確認済みの有効コードはありません。下の期限切れ/要確認リストと更新を確認してください。' : 'No confirmed active codes right now. Check expired/to-recheck codes below and watch this page for updates.'}
            codes={activeCodes}
            gameId={gameId}
            locale={locale}
            sourceLabels={sourceLabels}
          />

          <CodeSection
            title={locale === 'zh' ? '已过期 / 待复核兑换码' : locale === 'ja' ? '期限切れ / 要確認コード' : 'Expired / To-Recheck Codes'}
            emptyText={locale === 'zh' ? '暂未收录过期码。' : locale === 'ja' ? '期限切れコードはまだありません。' : 'No expired codes recorded yet.'}
            codes={expiredCodes}
            gameId={gameId}
            locale={locale}
            sourceLabels={sourceLabels}
          />
        </>
      )}
    </div>
  );
}

function AniimoRedeemHub({ locale }: { locale: SupportedLocale }) {
  const t = (zh: string, en: string, ja?: string) => locale === 'zh' ? zh : locale === 'ja' ? (ja ?? en) : en;
  const rewards = [
    ['Junior Wayfarer Prismana Aniimo choice', 'Junior Wayfarer Prismana Aniimo choice'],
    ['Mysterious Susuta egg', 'Mysterious Susuta egg'],
    ['10M milestone: Glimmer x200', '10M milestone: Glimmer x200'],
    ['15M milestone: Aniipod Ultra x2', '15M milestone: Aniipod Ultra x2'],
    ['20M milestone: Companion Promise avatar frame', '20M milestone: Companion Promise avatar frame'],
    ['30M milestone: Sunlit Meadow outfit', '30M milestone: Sunlit Meadow outfit'],
  ] as const;
  const sources = ['Official website', 'Steam', 'Epic Games Store', 'Xbox', 'PlayStation', 'App Store', 'Google Play'] as const;

  return (
    <div className="mb-8 space-y-6">
      <section className="rounded-lg border border-game-border bg-game-surface p-6">
        <h2 className="mb-3 text-lg font-semibold text-game-text">
          {t('伊莫兑换码状态', 'Aniimo Code Status', 'アニモコード状況')}
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-game-text-muted">
          {t(
            '截至 2026-08-27，暂无已确认的公开伊莫兑换码。PC/主机上线日期为 2026-09-16，移动端上线日期为 2026-09-23；上线后将优先核验游戏内兑换入口、官网新闻、平台商店活动和官方社区。',
            'As of 2026-08-27, no public Aniimo redeem code is confirmed. PC/console launches on 2026-09-16 and mobile launches on 2026-09-23; after launch, this page will verify the in-game redemption flow, official news, store campaigns, and community posts.',
            '2026-08-27時点で、公開交換コードは未確認です。PC/コンソールは2026-09-16、モバイルは2026-09-23予定。リリース後に交換入口と公式情報を確認します。'
          )}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded bg-game-surface-alt p-3">
            <div className="text-xs text-game-text-muted">{t('当前有效码', 'Active Codes', '有効コード')}</div>
            <div className="mt-1 text-xl font-bold text-game-primary">0</div>
          </div>
          <div className="rounded bg-game-surface-alt p-3">
            <div className="text-xs text-game-text-muted">{t('已确认奖励', 'Confirmed Rewards', '確認済み報酬')}</div>
            <div className="mt-1 text-xl font-bold text-game-primary">{rewards.length}</div>
          </div>
          <div className="rounded bg-game-surface-alt p-3">
            <div className="text-xs text-game-text-muted">{t('下一次重点核验', 'Next Check', '次回確認')}</div>
            <div className="mt-1 text-sm font-semibold text-game-text">2026-09-16</div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-game-border bg-game-surface p-6">
        <h2 className="mb-3 text-lg font-semibold text-game-text">{t('已确认奖励', 'Confirmed Rewards', '確認済み報酬')}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {rewards.map(([zh, en]) => (
            <div key={en} className="rounded bg-game-surface-alt p-3 text-sm text-game-text">
              {locale === 'zh' ? zh : en}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-game-border bg-game-surface p-6">
        <h2 className="mb-3 text-lg font-semibold text-game-text">{t('上线后核验来源', 'Launch Verification Sources', 'リリース後確認元')}</h2>
        <div className="flex flex-wrap gap-2">
          {sources.map((source) => (
            <span key={source} className="rounded bg-game-surface-alt px-3 py-1.5 text-sm text-game-text">
              {source}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function RocoRedeemHub({ locale }: { locale: SupportedLocale }) {
  const t = (zh: string, en: string, ja?: string) => locale === 'zh' ? zh : locale === 'ja' ? (ja ?? en) : en;
  const rewards = [
    ['CBT 报名资格邮件', 'CBT eligibility email', 'CBT資格メール'],
    ['预注册里程碑奖励', 'Pre-registration milestones', '事前登録マイルストーン'],
    ['测试平台下载资格', 'CBT platform download access', 'CBT平台DL資格'],
    ['上线后活动奖励', 'Launch event rewards', 'リリース後イベント報酬'],
  ] as const;
  const sources = [
    ['官网 rocokingdom.com', 'Official site rocokingdom.com', '公式 rocokingdom.com'],
    ['官方资格邮件', 'Official eligibility emails', '公式資格メール'],
    ['App Store / Google Play', 'App Store / Google Play', 'App Store / Google Play'],
    ['Steam / Epic / Microsoft Store', 'Steam / Epic / Microsoft Store', 'Steam / Epic / Microsoft Store'],
    ['官方社媒公告', 'Official social posts', '公式SNS告知'],
  ] as const;

  return (
    <div className="mb-8 space-y-6">
      <section className="rounded-lg border border-game-border bg-game-surface p-6">
        <h2 className="mb-3 text-lg font-semibold text-game-text">
          {t('Roco Kingdom 国际服兑换码状态', 'Roco Kingdom Global Code Status', 'ロコキングダム国際版コード状況')}
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-game-text-muted">
          {t(
            '截至 2026-09-07，国际服暂无已确认的公开兑换码。当前最重要的是 CBT 报名、资格邮件、预注册里程碑和 2026-10-27 开测后的游戏内入口核验。',
            'As of 2026-09-07, the global version has no confirmed public redeem codes. The current priority is CBT registration, eligibility mail, pre-registration milestones, and in-client verification after the October 27, 2026 test opens.',
            '2026-09-07時点で、国際版の公開交換コードは未確認です。現在はCBT応募、資格メール、事前登録マイルストーン、2026-10-27開始後のゲーム内入口確認が優先です。'
          )}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded bg-game-surface-alt p-3">
            <div className="text-xs text-game-text-muted">{t('当前有效码', 'Active Codes', '有効コード')}</div>
            <div className="mt-1 text-xl font-bold text-game-primary">0</div>
          </div>
          <div className="rounded bg-game-surface-alt p-3">
            <div className="text-xs text-game-text-muted">{t('待核验奖励', 'Rewards to Track', '確認待ち報酬')}</div>
            <div className="mt-1 text-xl font-bold text-game-primary">{rewards.length}</div>
          </div>
          <div className="rounded bg-game-surface-alt p-3">
            <div className="text-xs text-game-text-muted">{t('下一次重点核验', 'Next Check', '次回確認')}</div>
            <div className="mt-1 text-sm font-semibold text-game-text">2026-10-27</div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-game-border bg-game-surface p-6">
        <h2 className="mb-3 text-lg font-semibold text-game-text">{t('需要追踪的奖励', 'Rewards to Track', '追跡する報酬')}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {rewards.map(([zh, en, ja]) => (
            <div key={en} className="rounded bg-game-surface-alt p-3 text-sm text-game-text">
              {t(zh, en, ja)}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-game-border bg-game-surface p-6">
        <h2 className="mb-3 text-lg font-semibold text-game-text">{t('上线后核验来源', 'Launch Verification Sources', 'リリース後確認元')}</h2>
        <div className="flex flex-wrap gap-2">
          {sources.map(([zh, en, ja]) => (
            <span key={en} className="rounded bg-game-surface-alt px-3 py-1.5 text-sm text-game-text">
              {t(zh, en, ja)}
            </span>
          ))}
        </div>
      </section>
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

function CodeSection({
  title,
  emptyText,
  codes,
  gameId,
  locale,
  sourceLabels,
}: {
  title: string;
  emptyText: string;
  codes: RedeemCodeEntry[];
  gameId: GameId;
  locale: SupportedLocale;
  sourceLabels: Record<string, Record<string, string>>;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-semibold text-game-text">
        {title} ({codes.length})
      </h2>
      {codes.length > 0 ? (
        <div className="space-y-3">
          {codes.map((code) => (
            <CodeCard key={`${code.region}-${code.code}`} gameId={gameId} code={code} locale={locale} sourceLabels={sourceLabels} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-game-border bg-game-surface p-6 text-sm text-game-text-muted">
          {emptyText}
        </div>
      )}
    </section>
  );
}

async function CodeCard({ gameId, code, locale, sourceLabels }: { gameId: GameId; code: RedeemCodeEntry; locale: SupportedLocale; sourceLabels: Record<string, Record<string, string>> }) {
  const active = isRedeemCodeActive(code);
  const sourceLabel = sourceLabels[code.source]?.[locale] ?? code.source;
  const regionLabel = code.region === 'cn'
    ? locale === 'zh' ? '国服' : locale === 'ja' ? '中国サーバー' : 'CN'
    : locale === 'zh' ? '国际服' : locale === 'ja' ? 'グローバル' : 'Global';

  return (
    <div className={`rounded-lg border bg-game-surface p-4 ${active ? 'border-game-border' : 'border-game-border/60 opacity-75'}`}>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <code className="rounded bg-game-surface-alt px-3 py-1 text-sm font-mono font-bold text-game-primary select-all">{code.code}</code>
        {active ? (
          <span className="rounded bg-green-900/30 px-2 py-0.5 text-xs text-green-400">
            {locale === 'zh' ? '有效' : locale === 'ja' ? '有効' : 'Active'}
          </span>
        ) : (
          <span className="rounded bg-red-900/30 px-2 py-0.5 text-xs text-red-400">
            {locale === 'zh' ? '已过期/待复核' : locale === 'ja' ? '期限切れ/要確認' : 'Expired / Recheck'}
          </span>
        )}
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{sourceLabel}</span>
        <span className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-text-muted">{regionLabel}</span>
      </div>
      <p className="text-sm text-game-text-muted">{await getRedeemCodeReward(gameId, code, locale)}</p>
      {code.expiresAt && (
        <p className="mt-1 text-xs text-game-text-muted">
          {locale === 'zh' ? `有效期: ${formatDateLabel(code.expiresAt, locale)}` : locale === 'ja' ? `期限: ${formatDateLabel(code.expiresAt, locale)}` : `Expires: ${formatDateLabel(code.expiresAt, locale)}`}
        </p>
      )}
      {code.revealedAt && (
        <p className="mt-1 text-xs text-game-text-muted">
          {locale === 'zh' ? `收录: ${formatDateLabel(code.revealedAt, locale)}` : locale === 'ja' ? `掲載: ${formatDateLabel(code.revealedAt, locale)}` : `Added: ${formatDateLabel(code.revealedAt, locale)}`}
        </p>
      )}
    </div>
  );
}
