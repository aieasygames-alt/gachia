import { GAMES, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/navigation';
import { getWeaponDetailData, getWeaponsForStaticParams } from '@/lib/game-data/weapons';
import type { WeaponDetailData } from '@/lib/game-data/weapons';
import { buildWeaponJsonLd } from '@/lib/jsonld';
import { serializeJsonLd } from '@/lib/jsonld-script';
import { buildLocalizedAlternates, limitMetaTitle } from '@/lib/seo-metadata';
import { hi3WeaponMetadata, hi3WeaponScope } from '@/lib/hi3-weapon-scope';

const RARITY_COLORS: Record<number, string> = { 1: '#9ca3af', 2: '#4ade80', 3: '#60a5fa', 4: '#a855f7', 5: '#eab308' };






type NextStepLink = {
  href: string;
  title: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
};

const WEAPON_NEXT_STEPS: Partial<Record<GameId, NextStepLink[]>> = {
  genshin: [
    {
      href: '/genshin/characters',
      title: { zh: '看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' },
      description: { zh: '把武器和适合它的角色对上', en: 'Match the weapon to the right characters', ja: '適性キャラを確認' },
    },
    {
      href: '/genshin/items',
      title: { zh: '看材料图鉴', en: 'Browse materials', ja: '素材図鑑へ' },
      description: { zh: '继续看武器突破材料来源', en: 'Continue with ascension material sources', ja: '突破素材の入手先を確認' },
    },
    {
      href: '/genshin/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '继续查看版本与养成专题', en: 'Continue into version and build guides', ja: '版本・育成ガイドへ進む' },
    },
  ],
  starrail: [
    {
      href: '/starrail/characters',
      title: { zh: '看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' },
      description: { zh: '先看谁最适合这把光锥', en: 'See which characters fit this light cone', ja: '相性キャラを確認' },
    },
    {
      href: '/starrail/items',
      title: { zh: '看材料图鉴', en: 'Browse materials', ja: '素材図鑑へ' },
      description: { zh: '补齐光锥升级材料和掉落来源', en: 'Review light cone upgrade materials and drop sources', ja: '強化素材と入手先を確認' },
    },
    {
      href: '/starrail/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '继续看养成、卡池和版本攻略', en: 'Continue with build, banner, and version guides', ja: '育成・ガチャ・版本攻略へ' },
    },
  ],
  wuwa: [
    {
      href: '/wuwa/characters',
      title: { zh: '看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' },
      description: { zh: '把武器和适配角色串起来', en: 'Connect weapons with their best characters', ja: '武器と適性キャラを接続' },
    },
    {
      href: '/wuwa/items',
      title: { zh: '看材料图鉴', en: 'Browse materials', ja: '素材図鑑へ' },
      description: { zh: '继续看突破材料和刷取路线', en: 'Continue with ascension materials and farming routes', ja: '突破素材と周回ルートを確認' },
    },
    {
      href: '/wuwa/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '继续查看版本和声骸专题', en: 'Continue into version and echo guides', ja: '版本・声骸攻略へ進む' },
    },
  ],
  nte: [
    {
      href: '/nte/characters',
      title: { zh: '看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' },
      description: { zh: '先确认武器适配的角色', en: 'Check the characters this weapon suits', ja: '適性キャラを確認' },
    },
    {
      href: '/nte/items',
      title: { zh: '看材料图鉴', en: 'Browse materials', ja: '素材図鑑へ' },
      description: { zh: '继续看武器升级材料', en: 'Continue with weapon upgrade materials', ja: '武器強化素材を確認' },
    },
    {
      href: '/nte/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '继续查看 Boss 和养成攻略', en: 'Continue into boss and build guides', ja: 'ボス・育成攻略へ進む' },
    },
  ],
  zzz: [
    {
      href: '/zzz/characters',
      title: { zh: '看代理人图鉴', en: 'Browse agents', ja: 'エージェント図鑑へ' },
      description: { zh: '先看适配这把音擎的代理人', en: 'See which agents fit this W-Engine', ja: '適性エージェントを確認' },
    },
    {
      href: '/zzz/drive-discs',
      title: { zh: '看驱动盘图鉴', en: 'Browse drive discs', ja: 'ドライブディスクへ' },
      description: { zh: '把音擎和驱动盘配套思路补齐', en: 'Fill in the disc pairing logic', ja: '音擎とディスクの組み合わせを補完' },
    },
    {
      href: '/zzz/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '继续看配队、版本和养成专题', en: 'Continue with team, version, and build guides', ja: '編成・版本・育成へ' },
    },
  ],
  hi3: [
    {
      href: '/hi3/characters',
      title: { zh: '看首批女武神资料', en: 'Browse first battlesuit entries', ja: '初回戦乙女データを見る' },
      description: { zh: '将武器定位与官方已核验的女武神资料对照。', en: 'Match the weapon role with officially verified battlesuit entries.', ja: '武器の役割を公式確認済み戦乙女データと照合します。' },
    },
    {
      href: '/hi3/items',
      title: { zh: '看装备材料', en: 'Browse gear materials', ja: '装備素材を見る' },
      description: { zh: '核对源晶、以太燃素和活动型奖励的当前状态。', en: 'Check the current state of Source Prisms, Ether Fuel, and event-based rewards.', ja: '源晶、エーテル燃料、イベント型報酬の現状を確認します。' },
    },
    {
      href: '/hi3/guides/v9-0-resource-returnee-checklist',
      title: { zh: '资源与回归核对', en: 'Resource and returnee checks', ja: '資源・復帰チェック' },
      description: { zh: '先确认补给、锻造和回归资格，再决定资源投入。', en: 'Verify supplies, crafting, and returnee status before investing resources.', ja: '資源投入前に補給、鍛造、復帰資格を確認します。' },
    },
  ],
  guihuan: [
    {
      href: '/guihuan/characters',
      title: { zh: '看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' },
      description: { zh: '先看这把武器适合谁', en: 'Check which characters suit this weapon', ja: '適性キャラを確認' },
    },
    {
      href: '/guihuan/items',
      title: { zh: '看材料图鉴', en: 'Browse materials', ja: '素材図鑑へ' },
      description: { zh: '继续看培养材料和来源', en: 'Continue with upgrade materials and sources', ja: '育成素材と入手先を確認' },
    },
    {
      href: '/guihuan/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '把武器页接到系统和版本专题', en: 'Connect the weapon page to system and version guides', ja: '武器ページをシステム・版本へ接続' },
    },
  ],
  ananta: [
    {
      href: '/ananta/characters',
      title: { zh: '看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' },
      description: { zh: '先找最适合的使用者', en: 'Find the best users first', ja: '適性キャラを確認' },
    },
    {
      href: '/ananta/items',
      title: { zh: '看材料图鉴', en: 'Browse materials', ja: '素材図鑑へ' },
      description: { zh: '继续看武器升级材料', en: 'Continue with weapon upgrade materials', ja: '武器強化素材を確認' },
    },
    {
      href: '/ananta/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '把武器页接到养成专题', en: 'Connect the weapon page to build guides', ja: '武器ページを育成攻略へ接続' },
    },
  ],
  endfield: [
    {
      href: '/endfield/events',
      title: { zh: '看测试后状态', en: 'View post-test status', ja: 'テスト後状態を見る' },
      description: { zh: '先确认武器资料适用范围与官方观察项', en: 'Check data scope and official watch items first', ja: '武器資料の範囲と公式確認項目を先に見る' },
    },
    {
      href: '/endfield/characters',
      title: { zh: '看干员图鉴', en: 'Browse operators', ja: 'オペレーター図鑑へ' },
      description: { zh: '先看这把武器适合哪些干员', en: 'Check which operators suit this weapon', ja: '適性オペレーターを確認' },
    },
    {
      href: '/endfield/items',
      title: { zh: '看材料图鉴', en: 'Browse materials', ja: '素材図鑑へ' },
      description: { zh: '继续看升级材料和获取地点', en: 'Continue with upgrade materials and sources', ja: '強化素材と入手先を確認' },
    },
  ],
  skjh: [
    {
      href: '/skjh/characters',
      title: { zh: '看角色图鉴', en: 'Browse characters', ja: 'キャラ図鑑へ' },
      description: { zh: '先找最合适的使用者', en: 'Find the best users first', ja: '適性キャラを確認' },
    },
    {
      href: '/skjh/items',
      title: { zh: '看材料图鉴', en: 'Browse materials', ja: '素材図鑑へ' },
      description: { zh: '继续看武器获取和强化路线', en: 'Continue with acquisition and upgrade paths', ja: '入手と強化ルートを確認' },
    },
    {
      href: '/skjh/guides',
      title: { zh: '看攻略专题', en: 'Open guide hub', ja: '攻略特集へ' },
      description: { zh: '把武器页接到专题攻略', en: 'Connect the weapon page to guide content', ja: '武器ページを攻略コンテンツへ接続' },
    },
  ],
};

export async function generateStaticParams() {
  const gameIds = Object.keys(GAMES) as GameId[];
  const params = await Promise.all(gameIds.map(async (gameId) => {
    const weapons = await getWeaponsForStaticParams(gameId);
    return LOCALES.flatMap((lang) => weapons.map((weapon) => ({ lang, game: gameId, id: weapon.id })));
  }));
  return params.flat();
}

const BASE_URL = 'https://gachia.com';

type LocaleMeta = Partial<Record<SupportedLocale, { title: string; description: string }>>;

const WEAPON_META_OVERRIDES: Record<string, LocaleMeta> = {
  'genshin/sacrificial-jade': {
    en: {
      title: 'Sacrificial Jade Genshin: Stats, Best Users & Builds',
      description: 'Sacrificial Jade guide for Genshin Impact: 4-star Catalyst, CRIT Rate 36.8% at Lv.90, HP and EM passive, best users, and builds.',
    },
    zh: {
      title: '遗祀玉珑攻略：属性、适用角色与配装推荐',
      description: '原神遗祀玉珑属性解析：4星法器，满级暴击率36.8%，离场提升生命值与元素精通，查看适用角色和配装思路。',
    },
  },
  'genshin/jadefalls-splendor': {
    en: {
      title: "Jadefall's Splendor Genshin: Stats, Best Users & Build Tips",
      description: "Jadefall's Splendor guide for Genshin Impact: 5-star Catalyst stats, passive details, best characters, and build tips.",
    },
    zh: {
      title: '碧落之珑攻略：属性、适用角色与配装推荐',
      description: '原神碧落之珑攻略，整理属性、技能效果、适用角色与配装建议，帮助你判断是否值得培养。',
    },
  },
  'genshin/favonius-codex': {
    en: {
      title: 'Favonius Codex Genshin: Stats, Best Users & Builds',
      description: 'Favonius Codex guide for Genshin Impact: 4-star Catalyst stats, Energy Recharge passive, best users, and build recommendations.',
    },
    zh: {
      title: '西风秘典攻略：属性、适用角色与配装推荐',
      description: '原神西风秘典攻略，整理属性、充能效果、适用角色和配装建议，方便快速做出培养判断。',
    },
  },
  'genshin/wolf-fang': {
    en: {
      title: 'Wolf-Fang Genshin: Stats, Passive, Battle Pass & Best Users',
      description: 'Wolf-Fang Genshin guide: 4-star Sword, CRIT Rate substat, Normal Attack and Elemental Skill CRIT passive, Battle Pass source, and best-user checks.',
    },
    zh: {
      title: '狼牙攻略：属性、被动、纪行获取与适用角色',
      description: '原神狼牙攻略：4星单手剑、暴击率副属性、普攻与元素战技暴击被动、纪行获取方式，以及适配角色判断。',
    },
  },
  'genshin/lost-prayer-to-the-sacred-winds': {
    en: {
      title: 'Lost Prayer Genshin: Stats, Passive & Best Catalyst Users',
      description: 'Lost Prayer to the Sacred Winds guide: 5-star Catalyst, CRIT Rate substat, movement speed and on-field Elemental DMG passive, Gacha source, and best-user checks.',
    },
    zh: {
      title: '四风原典攻略：属性、被动与适用法器角色',
      description: '原神四风原典攻略：5星法器、暴击率副属性、移速与站场元素伤害被动、祈愿获取方式，以及适配角色判断。',
    },
  },
  'genshin/key-of-khaj-nisut': {
    en: {
      title: 'Key of Khaj-Nisut Genshin: HP Sword Stats, Passive & Users',
      description: 'Key of Khaj-Nisut guide: 5-star HP Sword, HP substat, HP and Elemental Mastery passive, Gacha source, signature association, and best-user checks.',
    },
    zh: {
      title: '圣显之钥攻略：生命单手剑属性、被动与适用角色',
      description: '原神圣显之钥攻略：5星生命值单手剑、生命值与元素精通被动、祈愿获取方式、妮露关联与适配角色判断。',
    },
  },
  'genshin/a-thousand-blazing-suns': {
    en: {
      title: 'A Thousand Blazing Suns Genshin: Stats, Best Users & Builds',
      description: 'A Thousand Blazing Suns guide for Genshin Impact: 5-star Claymore stats, passive, best users, and build tips.',
    },
    zh: {
      title: 'A Thousand Blazing Suns 攻略：属性、适用角色与配装推荐',
      description: '原神 A Thousand Blazing Suns 攻略，整理属性、技能效果、适用角色与配装建议，适合想快速判断是否培养。',
    },
  },
};

function buildAlternates(locale: SupportedLocale, gameId: string, id: string) {
  return buildLocalizedAlternates(locale, (lang) => `/${lang}/${gameId}/weapons/${id}`, LOCALES);
}

function buildOg(title: string, description: string, gameId: string, id: string, locale: string) {
  return {
    title,
    description,
    url: `${BASE_URL}/${locale}/${gameId}/weapons/${id}`,
    siteName: 'Gachia' as const,
    images: [{ url: `${BASE_URL}/images/og/${gameId}.webp`, width: gameId === 'hi3' ? 1024 : 1200, height: gameId === 'hi3' ? 1024 : 630 }],
    locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
  };
}

function buildWeaponMetaDescription(base: string, locale: SupportedLocale) {
  const addition = locale === 'zh'
    ? '本页补充适配角色、获取方式和实战定位，方便你判断这把武器是否值得优先培养。'
    : locale === 'ja'
      ? 'おすすめキャラ、入手方法、実戦での役割を補足し、育成優先度の判断に役立てます。'
      : 'The page also covers recommended users, acquisition, and practical role so you can judge whether the weapon is worth investing in.';
  const text = base.trim().length >= 120 ? base.trim() : `${base.trim()} ${addition}`;
  return text;
}

function WeaponJsonLd({
  gameId,
  locale,
  name,
  description,
  weaponId,
}: {
  gameId: GameId;
  locale: SupportedLocale;
  name: string;
  description: string;
  weaponId: string;
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: serializeJsonLd(buildWeaponJsonLd({ gameId, locale, name, description, weaponId })),
      }}
    />
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string; id: string }>;
}) {
  const { lang, game, id } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  const gameName = GAMES[gameId]?.name[locale] ?? '';
  const detail = await getWeaponDetailData(gameId, id, locale);

  if (!detail) return {};

  const override = WEAPON_META_OVERRIDES[`${gameId}/${id}`]?.[locale];
  if (override) {
    return {
      ...override,
      alternates: buildAlternates(locale, gameId, id),
      openGraph: buildOg(override.title, override.description, gameId, id, locale),
    };
  }

  if (gameId === 'hi3') {
    const meta = hi3WeaponMetadata(locale, detail.name);
    meta.title = limitMetaTitle(meta.title, hi3WeaponMetadata(locale).title);
    return { ...meta, alternates: buildAlternates(locale, gameId, id), openGraph: buildOg(meta.title, meta.description, gameId, id, locale),
      twitter: { card: 'summary_large_image', title: meta.title, description: meta.description, images: [`${BASE_URL}/images/og/hi3.webp`] } };
  }

  const statSuffix = detail.titleStat ? ` (${detail.titleStat})` : '';
  const weaponNoun = gameId === 'zzz' ? 'W-Engine' : 'Weapon';
  const title = locale === 'zh'
    ? `${detail.name}${statSuffix} — ${gameName}武器攻略 | 给谁用最好？`
    : locale === 'ja'
      ? `${detail.name}${statSuffix} — ${gameName}武器評価${detail.hasPassive ? ' | スキルとおすすめキャラ' : ' | おすすめキャラ'}`
      : `${detail.name}${statSuffix} — ${gameName} ${weaponNoun}: Stats, Best Characters & Builds`;

  let desc: string;
  if (detail.effectDescription && detail.statsLine) {
    desc = `${detail.statsLine}. ${detail.effectDescription}`.slice(0, 160);
  } else if (detail.statsLine) {
    desc = locale === 'zh'
      ? `${detail.name}：${detail.statsLine}。查看${detail.hasPassive ? '技能效果、' : ''}获取方式及推荐角色。`
      : locale === 'ja'
        ? `${detail.name}：${detail.statsLine}。${detail.hasPassive ? 'スキル効果、' : ''}入手方法、おすすめキャラを確認。`
        : `${detail.name} — ${detail.statsLine}. See ${detail.hasPassive ? 'skill effect, ' : ''}how to get it, and best characters.`;
  } else if (detail.effectDescription) {
    desc = `${detail.name}: ${detail.effectDescription}`.slice(0, 160);
  } else {
    desc = locale === 'zh'
      ? `${detail.name}是${gameName}中的武器，查看属性、${detail.hasPassive ? '技能效果、' : ''}获取方式及推荐使用的角色。`
      : locale === 'ja'
        ? `${detail.name}のステータス${detail.hasPassive ? '、スキル効果' : ''}、入手方法、おすすめキャラクターを確認。`
        : `Complete ${detail.name} guide for ${gameName}: stats${detail.hasPassive ? ', skill effect' : ''}, how to get it, and best characters to use it with.`;
  }

  const meta = { title, description: buildWeaponMetaDescription(desc, locale) };
  meta.title = limitMetaTitle(meta.title, `${detail.name} — ${gameName} ${weaponNoun} Guide`);
  return { ...meta, alternates: buildAlternates(locale, gameId, id), openGraph: buildOg(meta.title, meta.description, gameId, id, locale) };
}

export default async function WeaponDetailPage({
  params,
}: {
  params: Promise<{ lang: string; game: string; id: string }>;
}) {
  const { lang, game, id } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;

  if (gameId === 'sea') {
    notFound();
  }

  const detail = await getWeaponDetailData(gameId, id, locale);
  if (!detail) notFound();

  return <WeaponDetail detail={detail} locale={locale} />;
}

function WeaponDetail({ detail, locale }: { detail: WeaponDetailData; locale: SupportedLocale }) {
  const gameName = GAMES[detail.gameId].name[locale];
  const bodyDescription = detail.effectDescription || detail.source || detail.name;
  const description = detail.gameId === 'hi3' ? `${hi3WeaponScope[locale]} ${bodyDescription}` : bodyDescription;

  return (
    <div>
      <WeaponJsonLd gameId={detail.gameId} locale={locale} name={detail.name} description={description} weaponId={detail.id} />
      <Breadcrumb game={detail.gameId} gameName={gameName} locale={locale} />
      <Header name={detail.name} nameAlt={detail.nameAlt} rarity={detail.rarity} rank={detail.rank} />
      {detail.gameId === 'hi3' && <p data-hi3-weapon-scope className="mb-4 rounded-md border border-game-border bg-game-surface px-4 py-3 text-sm leading-relaxed text-game-text-muted">{hi3WeaponScope[locale]}</p>}
      <div className={`grid gap-4 sm:grid-cols-2 ${detail.infoCards.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        {detail.infoCards.map((card) => (
          <InfoCard key={card.label} label={card.label} value={card.value} />
        ))}
      </div>
      <EffectSection detail={detail} locale={locale} />
      {detail.source && <SourceSection source={detail.source} locale={locale} />}
      <UsageTipsSection detail={detail} gameName={gameName} locale={locale} />
      <NextStepSection gameId={detail.gameId} locale={locale} />
      <BreadcrumbJsonLd gameId={detail.gameId} gameName={gameName} name={detail.name} locale={locale} />
    </div>
  );
}

function EffectSection({ detail, locale }: { detail: WeaponDetailData; locale: SupportedLocale }) {
  if (!detail.effectName && !detail.effectDescription && !detail.showMissingEffect) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-3 text-lg font-semibold text-game-text">{detail.effectTitle}</h2>
      {detail.effectName || detail.effectDescription ? (
        <div className="rounded-lg border border-game-border bg-game-surface p-4">
          {detail.effectName && <div className="mb-1 text-sm font-medium text-game-primary">{detail.effectName}</div>}
          {detail.effectDescription && <p className="text-sm text-game-text-muted">{detail.effectDescription}</p>}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-game-border bg-game-surface p-4 text-center">
          <p className="text-sm text-game-text-muted">
            {locale === 'zh' ? '暂无技能效果数据' : locale === 'ja' ? 'スキル効果データなし' : 'Passive skill data not yet available'}
          </p>
        </div>
      )}
    </section>
  );
}

function BreadcrumbJsonLd({
  gameId,
  gameName,
  name,
  locale,
}: {
  gameId: GameId;
  gameName: string;
  name: string;
  locale: SupportedLocale;
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: serializeJsonLd({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: gameName, item: `https://gachia.com/${locale}/${gameId}` },
            { '@type': 'ListItem', position: 2, name: locale === 'zh' ? '武器' : locale === 'ja' ? '武器' : 'Weapons', item: `https://gachia.com/${locale}/${gameId}/weapons` },
            { '@type': 'ListItem', position: 3, name },
          ],
        }),
      }}
    />
  );
}

/* ---------- Shared Components ---------- */

function Breadcrumb({ game, gameName, locale }: { game: string; gameName: string; locale: SupportedLocale }) {
  return (
    <nav className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
      <Link href={`/${game}` as '/'} className="hover:text-game-primary">{gameName}</Link>
      <span>/</span>
      <Link href={`/${game}/weapons` as '/'} className="hover:text-game-primary">
        {locale === 'zh' ? '武器' : locale === 'ja' ? '武器' : 'Weapons'}
      </Link>
      <span>/</span>
    </nav>
  );
}

function Header({ name, nameAlt, rarity, rank }: { name: string; nameAlt: string; rarity: number; rank?: string }) {
  return (
    <div className="mb-6 rounded-lg border border-game-border bg-game-surface p-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-game-text">{name}</h1>
        {rank && (
          <span className="rounded bg-game-primary/20 px-2 py-0.5 text-sm font-bold text-game-primary">{rank}</span>
        )}
        {rarity > 0 && (
          <span className="text-sm font-bold" style={{ color: RARITY_COLORS[rarity] || '#888' }}>
            {'★'.repeat(rarity)}
          </span>
        )}
      </div>
      {nameAlt && <p className="mt-1 text-sm text-game-text-muted">{nameAlt}</p>}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-game-border bg-game-surface p-4">
      <div className="mb-1 text-xs text-game-text-muted">{label}</div>
      <div className="text-sm font-medium text-game-text">{value}</div>
    </div>
  );
}

function SourceSection({ source, locale }: { source: string; locale: SupportedLocale }) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-lg font-semibold text-game-text">
        {locale === 'zh' ? '获取途径' : locale === 'ja' ? '入手方法' : 'How to Obtain'}
      </h2>
      <div className="rounded-lg border border-game-border bg-game-surface p-4">
        <p className="text-sm text-game-text-muted">{source}</p>
      </div>
    </section>
  );
}

function UsageTipsSection({ detail, gameName, locale }: { detail: WeaponDetailData; gameName: string; locale: SupportedLocale }) {
  const stat = detail.titleStat || (locale === 'zh' ? '副属性' : locale === 'ja' ? 'サブステータス' : 'substat');
  const passive = detail.effectDescription;
  const tips = detail.gameId === 'hi3'
    ? {
      zh: '先确认已有武器与当前培养目标。朱华与朱华·全燃应结合客户端的超限解锁条件和升级成本判断；跃动火花的回归支援资格与选择范围须在当前回归页面确认。完整技能效果与数值请查看游戏内装备详情。',
      en: 'Check owned weapons and your current build target. Evaluate Vermillion Liuli and Full Burn against in-game PRI-ARM requirements and upgrade costs; verify Volatile Sparkler eligibility and choices on the current returnee page. Use in-game equipment details for full skills and values.',
      ja: '所持武器と育成目標を確認。朱華と朱華・全燃は超限解放条件と強化コストで判断し、ヴォラタイル・スパークラーの復帰資格と選択範囲は現在の復帰ページで確認。全スキル効果と数値はゲーム内装備詳細を参照してください。',
    }[locale]
    : locale === 'zh'
    ? `${detail.name}是${gameName}中的${detail.rarity > 0 ? `${detail.rarity}星` : ''}武器。先确认角色是否需要${stat}，再看被动是否能在该角色的常用站场时间和技能循环中稳定触发。${passive ? ` 当前数据中的被动为：${passive}。` : ''}不要只因稀有度投入资源；和角色页的定位、队伍与材料路线一起核对。`
    : locale === 'ja'
      ? `${detail.name}は${gameName}の${detail.rarity > 0 ? `${detail.rarity}星` : ''}武器です。まずキャラが${stat}を必要とするか、次にパッシブが通常の出場時間とスキル循環で安定して発動するかを確認します。${passive ? ` 現在のパッシブデータ：${passive}。` : ''}レアリティだけで育成せず、キャラページの役割、編成、素材ルートと合わせて判断してください。`
      : `${detail.name} is a ${detail.rarity > 0 ? `${detail.rarity}-star ` : ''}weapon in ${gameName}. First check whether a character wants its ${stat}; then check whether the passive can trigger consistently in that character's normal field time and skill loop.${passive ? ` Current passive data: ${passive}.` : ''} Do not invest on rarity alone; validate the choice with the character's role, team, and material route.`;
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-base font-semibold text-game-text">
        {locale === 'zh' ? '使用建议' : locale === 'ja' ? '使用アドバイス' : 'Usage Tips'}
      </h2>
      <div className="rounded-lg border border-game-border bg-game-surface p-4">
        <p className="text-sm leading-relaxed text-game-text-muted">{tips}</p>
      </div>
    </section>
  );
}

function NextStepSection({ gameId, locale }: { gameId: GameId; locale: SupportedLocale }) {
  const links = WEAPON_NEXT_STEPS[gameId];
  if (!links?.length) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-3 text-lg font-semibold text-game-text">
        {locale === 'zh' ? '下一步去看' : locale === 'ja' ? '次に見るページ' : 'Next Steps'}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href as '/'}
            className="group rounded-lg border border-game-border bg-game-surface p-4 transition-all hover:border-game-primary"
          >
            <h3 className="mb-1 text-sm font-semibold text-game-text group-hover:text-game-primary">
              {link.title[locale]}
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
