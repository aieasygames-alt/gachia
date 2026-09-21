import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { zzzDriveDiscs, getZzzDriveDiscName, getZzzDriveDiscDesc2pc, getZzzDriveDiscDesc4pc } from '@gachia/data/games/zzz/drive-discs';
import { getZzzCharacterName, getZzzCharacterById } from '@gachia/data/games/zzz/characters';
import { Link } from '@/lib/i18n/navigation';
import { ensureMetaLength } from '@/lib/seo-metadata';

const ELEMENT_COLORS: Record<string, string> = {
  physical: '#9ca3af', fire: '#ef4444', ice: '#67e8f9', electric: '#8b5cf6', ether: '#ec4899',
  'auric-ink': '#d4a017', 'honed-edge': '#c0c0c0', wind: '#6ee7b7',
};

type NextStepLink = {
  href: string;
  label: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
};

const ZZZ_DRIVE_DISC_NEXT_STEPS: NextStepLink[] = [
  {
    href: '/zzz/version',
    label: { zh: '先看 3.3 观察入口', en: 'Start with the v3.3 watch hub', ja: 'v3.3観察入口へ' },
    description: { zh: '3.3 观察、3.2 回顾和热词先看一遍', en: 'Review the v3.3 watchlist, v3.2 recap, and hot topics', ja: 'v3.3観察、v3.2回顧、注目トピックを確認', },
  },
  {
    href: '/zzz/characters',
    label: { zh: '继续看代理人图鉴', en: 'Browse agents', ja: '代理人図鑑へ' },
    description: { zh: '按代理人反查驱动盘毕业方向', en: 'See which agents want which disc sets', ja: '代理人ごとの完成形を確認', },
  },
  {
    href: '/zzz/weapons',
    label: { zh: '再看音擎图鉴', en: 'Browse W-Engines', ja: '音擎図鑑へ' },
    description: { zh: '把音擎和驱动盘一起配起来看', en: 'Pair W-Engines with disc planning', ja: '音擎とディスクの組み合わせを確認', },
  },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  const gameName = GAMES[gameId]?.name[locale] ?? '';
  if (game !== 'zzz') return { robots: { index: false, follow: false } };
  const label = locale === 'zh' ? '驱动盘' : locale === 'ja' ? 'ドライブディスク' : 'Drive Discs';
  const description = ensureMetaLength(
    locale === 'zh'
      ? `绝区零全驱动盘图鉴，包含通用套装和元素套装的2件套/4件套效果及推荐代理人`
      : locale === 'ja'
        ? `ゼンレスゾーンゼロ全ドライブディスク図鑑、2セット/4セット効果とおすすめエージェント`
        : `Complete Zenless Zone Zero Drive Disc guide with 2pc/4pc set bonuses and recommended agents`,
    locale,
  );

  return {
    title: `${label} - ${gameName}`,
    description,
    alternates: {
      canonical: `https://gachia.com/${locale}/zzz/drive-discs`,
      languages: { 'zh-Hans': `https://gachia.com/zh/zzz/drive-discs`, en: `https://gachia.com/en/zzz/drive-discs`, ja: `https://gachia.com/ja/zzz/drive-discs`, 'x-default': `https://gachia.com/zh/zzz/drive-discs` },
    },
  };
}

export default async function DriveDiscsPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const gameId = game as GameId;
  const locale = lang as SupportedLocale;
  const gameConfig = GAMES[gameId];

  if (gameId !== 'zzz') {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
          {CATEGORY_LABELS['drive-discs']?.[locale] ?? 'Drive Discs'}
        </h1>
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-game-border text-sm text-game-text-muted">
          Coming Soon
        </div>
      </div>
    );
  }

  const driveDiscs = zzzDriveDiscs;
  const general = driveDiscs.filter((d) => d.category === 'general');
  const elemental = driveDiscs.filter((d) => d.category === 'elemental');

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS['drive-discs']?.[locale] ?? 'Drive Discs'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${driveDiscs.length} 套驱动盘` : locale === 'ja' ? `${driveDiscs.length} セット` : `${driveDiscs.length} Drive Disc Sets`}
      </p>

      {general.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            {locale === 'zh' ? '通用套装' : locale === 'ja' ? '汎用セット' : 'General'} ({general.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {general.map((dd) => (
              <DriveDiscCard key={dd.id} dd={dd} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {elemental.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            {locale === 'zh' ? '元素套装' : locale === 'ja' ? '元素セット' : 'Elemental'} ({elemental.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {elemental.map((dd) => (
              <DriveDiscCard key={dd.id} dd={dd} locale={locale} />
            ))}
          </div>
        </section>
      )}

      <NextStepStrip locale={locale} links={ZZZ_DRIVE_DISC_NEXT_STEPS} />
    </div>
  );
}

function DriveDiscCard({ dd, locale }: { dd: typeof zzzDriveDiscs[number]; locale: SupportedLocale }) {
  const elementColor = dd.element ? ELEMENT_COLORS[dd.element] : undefined;

  return (
    <div className="rounded-lg border border-game-border bg-game-surface p-4">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="font-semibold text-game-text">
          <Link href={`/zzz/drive-discs/${dd.id}`} className="transition-colors hover:text-game-accent">
            {getZzzDriveDiscName(dd, locale)}
          </Link>
        </h3>
        {dd.element && (
          <span className="rounded px-1.5 py-0.5 text-xs text-white" style={{ backgroundColor: elementColor || '#888' }}>
            {dd.element}
          </span>
        )}
      </div>
      <div className="space-y-1.5 text-sm">
        <p><span className="text-game-primary font-medium">2pc:</span> <span className="text-game-text-muted">{getZzzDriveDiscDesc2pc(dd, locale)}</span></p>
        <p><span className="text-game-primary font-medium">4pc:</span> <span className="text-game-text-muted">{getZzzDriveDiscDesc4pc(dd, locale)}</span></p>
      </div>
      {dd.characters.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {dd.characters.slice(0, 6).map((charId) => {
            const char = getZzzCharacterById(charId);
            return char ? (
              <Link key={charId} href={`/zzz/characters/${charId}`}
                className="rounded bg-game-surface-alt px-2 py-0.5 text-xs text-game-primary transition-colors hover:text-game-accent">
                {getZzzCharacterName(char, locale)}
              </Link>
            ) : null;
          })}
          {dd.characters.length > 6 && <span className="text-xs text-game-text-muted">+{dd.characters.length - 6}</span>}
        </div>
      )}
    </div>
  );
}

function NextStepStrip({ locale, links }: { locale: SupportedLocale; links?: NextStepLink[] }) {
  if (!links?.length) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-base font-semibold text-game-text">
        {locale === 'zh' ? '继续往下看' : locale === 'ja' ? '次に見る' : 'Next steps'}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href as '/'}
            className="group rounded-lg border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary"
          >
            <h3 className="mb-1 text-sm font-semibold text-game-text group-hover:text-game-primary">
              {link.label[locale]}
            </h3>
            <p className="text-xs text-game-text-muted line-clamp-2">
              {link.description[locale]}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
