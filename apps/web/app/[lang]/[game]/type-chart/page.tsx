import { CATEGORY_LABELS, GAMES, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';
import {
  getEffectivenessLabel,
  getRocoTypeElements,
  getRocoTypeMatchups,
  getTypeMultiplier,
  isRocoTypeChartGame,
} from '@/lib/game-data/roco-type-chart';
import { buildLocalizedAlternates, ensureMetaLength } from '@/lib/seo-metadata';

const BASE_URL = 'https://gachia.com';

const COPY = {
  title: {
    zh: '洛克王国世界属性克制表',
    en: 'Roco Kingdom Type Chart',
    ja: 'ロコキングダム タイプ相性表',
  },
  subtitle: {
    zh: '按攻击属性和防御属性查看克制、抵抗和普通伤害。当前为资料站整理版，具体数值以游戏内与官方公告为准。',
    en: 'Check strong, resisted, and neutral matchups by attack type and defense type. This is a maintained reference; final values follow the live game and official notices.',
    ja: '攻撃タイプと防御タイプから有利、軽減、通常ダメージを確認できます。最終値はゲーム内表示と公式告知に従います。',
  },
  attack: { zh: '攻击属性', en: 'Attack Type', ja: '攻撃タイプ' },
  defense: { zh: '防御属性', en: 'Defense Type', ja: '防御タイプ' },
  quick: { zh: '克制速查', en: 'Quick Strong Matchups', ja: '有利相性の早見' },
  related: { zh: '继续查看', en: 'Continue To', ja: '次に見る' },
  source: { zh: '来源状态', en: 'Source Status', ja: '出典ステータス' },
  sourceText: {
    zh: '基于当前公开资料和国服实测资料整理，国际服 CBT 后需要再次核验。',
    en: 'Compiled from current public information and CN-version references; global CBT values should be rechecked after the test opens.',
    ja: '公開情報と中国版参考情報をもとに整理。国際版CBT開始後に再確認が必要です。',
  },
};

const RELATED_LINKS = [
  {
    href: '/characters',
    label: { zh: '精灵图鉴', en: 'Jinie Wiki', ja: 'ジニー図鑑' },
  },
  {
    href: '/tier-list',
    label: { zh: '节奏榜', en: 'Tier List', ja: 'ティアリスト' },
  },
  {
    href: '/guides',
    label: { zh: '攻略百科', en: 'Guides', ja: 'ガイド' },
  },
  {
    href: '/map',
    label: { zh: '地图探索', en: 'Map', ja: 'マップ' },
  },
];

export function generateStaticParams() {
  return LOCALES.flatMap((lang) =>
    (['roco', 'roco-cn'] as const).map((game) => ({ lang, game })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;

  if (!isRocoTypeChartGame(gameId)) {
    return { robots: { index: false, follow: false } };
  }

  const gameName = GAMES[gameId].name[locale];
  const label = CATEGORY_LABELS['type-chart']?.[locale] ?? COPY.title[locale];
  const title = locale === 'zh'
    ? `${gameName}属性克制表｜攻击/防御相性速查`
    : locale === 'ja'
      ? `${gameName} タイプ相性表｜攻撃・防御早見`
      : `${gameName} Type Chart — Attack and Defense Matchups`;
  const description = ensureMetaLength(
    locale === 'zh'
      ? `${gameName}${label}，整理草、火、水、电、冰、毒、土、翼、虫、光、暗等属性的克制、抵抗和普通伤害关系，适合配队、抓宠和 PvP 前快速查询。`
      : locale === 'ja'
        ? `${gameName}のタイプ相性表。草、炎、水、電気、氷、毒、地面、飛行、虫、光、闇などの有利・軽減・通常相性を確認できます。`
        : `${gameName} type chart covering Grass, Fire, Water, Electric, Ice, Poison, Ground, Flying, Bug, Light, Dark, and neutral matchups for team planning and PvP.`,
    locale,
  );

  return {
    title,
    description,
    alternates: buildLocalizedAlternates(locale, (lang) => `/${lang}/${gameId}/type-chart`, LOCALES),
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}/${gameId}/type-chart`,
      siteName: 'Gachia',
      images: [{ url: `${BASE_URL}/images/og/${gameId}.webp`, width: 1200, height: 630 }],
      locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
    },
  };
}

export default async function RocoTypeChartPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;

  if (!isRocoTypeChartGame(gameId)) {
    return null;
  }

  const elements = getRocoTypeElements(gameId);
  const matchups = getRocoTypeMatchups(gameId);
  const strongRows = matchups.filter((matchup) => matchup.multiplier === 2);
  const elementById = new Map(elements.map((element) => [element.id, element] as const));

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-game-text">{COPY.title[locale]}</h1>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-game-text-muted">
        {COPY.subtitle[locale]}
      </p>

      <section className="mb-8 rounded-md border border-game-border bg-game-surface p-4">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-game-text">{COPY.quick[locale]}</h2>
          <span className="text-xs text-game-text-muted">{strongRows.length} x 2</span>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {strongRows.map((matchup) => {
            const attack = elementById.get(matchup.attack);
            const defense = elementById.get(matchup.defense);
            if (!attack || !defense) return null;
            return (
              <a
                key={`${matchup.attack}-${matchup.defense}`}
                href={`#attack-${matchup.attack}`}
                className="flex items-center justify-between rounded border border-game-border bg-game-surface-alt px-3 py-2 text-sm transition-colors hover:border-game-primary"
              >
                <span className="font-medium text-game-text" style={{ color: attack.color }}>
                  {attack.name[locale]}
                </span>
                <span className="text-xs text-game-text-muted">2x</span>
                <span className="font-medium text-game-text" style={{ color: defense.color }}>
                  {defense.name[locale]}
                </span>
              </a>
            );
          })}
        </div>
      </section>

      <section className="mb-8 overflow-x-auto rounded-md border border-game-border bg-game-surface">
        <table className="min-w-[920px] w-full border-collapse text-sm">
          <caption className="sr-only">{COPY.title[locale]}</caption>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border-b border-game-border bg-game-surface p-3 text-left text-xs font-semibold uppercase text-game-text-muted">
                {COPY.attack[locale]} / {COPY.defense[locale]}
              </th>
              {elements.map((defense) => (
                <th key={defense.id} className="border-b border-game-border p-3 text-center text-xs font-semibold text-game-text">
                  <span style={{ color: defense.color }}>{defense.name[locale]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {elements.map((attack) => (
              <tr key={attack.id} id={`attack-${attack.id}`} className="border-b border-game-border last:border-b-0">
                <th className="sticky left-0 z-10 bg-game-surface p-3 text-left font-semibold" style={{ color: attack.color }}>
                  {attack.name[locale]}
                </th>
                {elements.map((defense) => {
                  const multiplier = getTypeMultiplier(attack.id, defense.id);
                  const tone = multiplier === 2
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : multiplier === 0.5
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                      : 'border-game-border bg-game-surface-alt text-game-text-muted';
                  return (
                    <td key={defense.id} className="p-2 text-center">
                      <span className={`inline-flex min-w-14 items-center justify-center rounded border px-2 py-1 text-xs font-semibold ${tone}`}>
                        {multiplier}x
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-8 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-game-border bg-game-surface p-4">
          <h2 className="mb-2 text-base font-semibold text-game-text">{COPY.source[locale]}</h2>
          <p className="text-sm leading-relaxed text-game-text-muted">{COPY.sourceText[locale]}</p>
        </div>
        <div className="rounded-md border border-game-border bg-game-surface p-4">
          <h2 className="mb-3 text-base font-semibold text-game-text">{COPY.related[locale]}</h2>
          <div className="flex flex-wrap gap-2">
            {RELATED_LINKS.map((link) => (
              <Link
                key={link.href}
                href={`/${gameId}${link.href}` as '/'}
                className="rounded-full border border-game-border px-3 py-1 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary"
              >
                {link.label[locale]}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
