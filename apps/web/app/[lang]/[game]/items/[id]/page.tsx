import { GAMES, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { notFound } from 'next/navigation';
import {
  genshinMaterials, getGenshinMaterialById, getGenshinMaterialName,
  starrailMaterials, getStarRailMaterialById, getStarRailMaterialName,
  wuwaMaterials, getWuWaMaterialById, getWuWaMaterialName,
  nteMaterials, getNteMaterialById, getNteMaterialName,
  zzzMaterials, getZzzMaterialById, getZzzMaterialName,
  guihuanMaterials, getGuihuanMaterialById, getGuihuanMaterialName,
} from '@gachia/data';
import { Link } from '@/lib/i18n/navigation';

const RARITY_COLORS = ['', '#9ca3af', '#4ade80', '#60a5fa', '#a855f7', '#eab308'];

const TYPE_LABELS: Record<string, Record<string, string>> = {
  'character-ascension': { zh: '角色突破材料', en: 'Character Ascension', ja: 'キャラ突破素材' },
  'talent-book': { zh: '天赋书', en: 'Talent Book', ja: '天賦本' },
  'boss-drop': { zh: 'Boss掉落', en: 'Boss Drop', ja: 'ボスドロップ' },
  'weekly-boss': { zh: '周本材料', en: 'Weekly Boss', ja: '週ボス素材' },
  'local-specialty': { zh: '区域特产', en: 'Local Specialty', ja: '地域特産品' },
  'common-drop': { zh: '普通掉落', en: 'Common Drop', ja: '一般ドロップ' },
  'exp-material': { zh: '经验材料', en: 'EXP Material', ja: '経験値素材' },
  currency: { zh: '货币', en: 'Currency', ja: '通貨' },
  special: { zh: '特殊材料', en: 'Special', ja: '特殊素材' },
  trace: { zh: '行迹材料', en: 'Trace Material', ja: '軌跡素材' },
  boss: { zh: 'Boss掉落', en: 'Boss Drop', ja: 'ボスドロップ' },
  common: { zh: '普通材料', en: 'Common Material', ja: '一般素材' },
  'skill-material': { zh: '技能材料', en: 'Skill Material', ja: 'スキル素材' },
  'boss-material': { zh: 'Boss材料', en: 'Boss Material', ja: 'ボス素材' },
  guide: { zh: '猎手指南', en: 'Hunter Guide', ja: 'ハンターガイド' },
  'arc-exp': { zh: '弧盘经验', en: 'Arc EXP', ja: 'アルクEXP' },
  'module-exp': { zh: '模块经验', en: 'Module EXP', ja: 'モジュールEXP' },
  ascension: { zh: '突破材料', en: 'Ascension', ja: '昇格素材' },
  permit: { zh: '许可', en: 'Permit', ja: '許可証' },
  manual: { zh: '技能手册', en: 'Skill Manual', ja: 'スキルマニュアル' },
};

export async function generateStaticParams() {
  return LOCALES.flatMap((lang) => [
    ...genshinMaterials.map((m) => ({ lang, game: 'genshin', id: m.id })),
    ...starrailMaterials.map((m) => ({ lang, game: 'starrail', id: m.id })),
    ...wuwaMaterials.map((m) => ({ lang, game: 'wuwa', id: m.id })),
    ...nteMaterials.map((m) => ({ lang, game: 'nte', id: m.id })),
    ...zzzMaterials.map((m) => ({ lang, game: 'zzz', id: m.id })),
    ...guihuanMaterials.map((m) => ({ lang, game: 'guihuan', id: m.id })),
  ]);
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

  let name = '';
  let description = '';

  if (gameId === 'genshin') {
    const m = getGenshinMaterialById(id);
    if (!m) return {};
    name = getGenshinMaterialName(m, locale);
    description = (locale === 'en' ? m.sourceEn : m.source).slice(0, 160);
  } else if (gameId === 'starrail') {
    const m = getStarRailMaterialById(id);
    if (!m) return {};
    name = getStarRailMaterialName(m, locale);
    description = (locale === 'en' ? m.sourceEn : m.source).slice(0, 160);
  } else if (gameId === 'wuwa') {
    const m = getWuWaMaterialById(id);
    if (!m) return {};
    name = getWuWaMaterialName(m, locale);
    description = (locale === 'en' ? m.sourceEn : m.source).slice(0, 160);
  } else if (gameId === 'nte') {
    const m = getNteMaterialById(id);
    if (!m) return {};
    name = getNteMaterialName(m, locale);
    description = m.source.slice(0, 160);
  } else if (gameId === 'zzz') {
    const m = getZzzMaterialById(id);
    if (!m) return {};
    name = getZzzMaterialName(m, locale);
    description = m.source.slice(0, 160);
  } else if (gameId === 'guihuan') {
    const m = getGuihuanMaterialById(id);
    if (!m) return {};
    name = getGuihuanMaterialName(m, locale);
    description = (locale === 'en' ? m.sourceEn : m.source).slice(0, 160);
  }

  return {
    title: `${name} - ${gameName} Wiki`,
    description,
    alternates: {
      canonical: `https://gachia.com/${locale}/${gameId}/items/${id}`,
      languages: {
        'zh-Hans': `https://gachia.com/zh/${gameId}/items/${id}`,
        en: `https://gachia.com/en/${gameId}/items/${id}`,
        ja: `https://gachia.com/ja/${gameId}/items/${id}`,
        'x-default': `https://gachia.com/zh/${gameId}/items/${id}`,
      },
    },
  };
}

interface ItemData {
  name: string;
  nameAlt: string;
  rarity: number;
  type: string;
  source: string;
}

function getItemData(gameId: GameId, id: string, locale: SupportedLocale): ItemData | null {
  if (gameId === 'genshin') {
    const m = getGenshinMaterialById(id);
    if (!m) return null;
    return { name: getGenshinMaterialName(m, locale), nameAlt: locale === 'zh' ? m.nameEn : m.name, rarity: m.rarity, type: m.type, source: locale === 'en' ? m.sourceEn : m.source };
  }
  if (gameId === 'starrail') {
    const m = getStarRailMaterialById(id);
    if (!m) return null;
    return { name: getStarRailMaterialName(m, locale), nameAlt: locale === 'zh' ? m.nameEn : m.name, rarity: m.rarity, type: m.type, source: locale === 'en' ? m.sourceEn : m.source };
  }
  if (gameId === 'wuwa') {
    const m = getWuWaMaterialById(id);
    if (!m) return null;
    return { name: getWuWaMaterialName(m, locale), nameAlt: locale === 'zh' ? m.nameEn : m.name, rarity: m.rarity, type: m.type, source: locale === 'en' ? m.sourceEn : m.source };
  }
  if (gameId === 'nte') {
    const m = getNteMaterialById(id);
    if (!m) return null;
    return { name: getNteMaterialName(m, locale), nameAlt: locale === 'zh' ? (m.nameEn ?? '') : (m.name ?? ''), rarity: m.rarity, type: m.type, source: m.source };
  }
  if (gameId === 'zzz') {
    const m = getZzzMaterialById(id);
    if (!m) return null;
    return { name: getZzzMaterialName(m, locale), nameAlt: locale === 'zh' ? m.nameEn : m.name, rarity: m.rarity, type: m.type, source: m.source };
  }
  if (gameId === 'guihuan') {
    const m = getGuihuanMaterialById(id);
    if (!m) return null;
    return { name: getGuihuanMaterialName(m, locale), nameAlt: locale === 'zh' ? m.nameEn : m.name, rarity: m.rarity, type: m.type, source: locale === 'en' ? m.sourceEn : m.source };
  }
  return null;
}

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ lang: string; game: string; id: string }>;
}) {
  const { lang, game, id } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  const gameConfig = GAMES[gameId];

  const data = getItemData(gameId, id, locale);
  if (!data) notFound();

  const typeLabel = TYPE_LABELS[data.type]?.[locale] ?? data.type;
  const gameName = gameConfig.name[locale];

  return (
    <div>
      <nav className="mb-4 flex items-center gap-2 text-sm text-game-text-muted">
        <Link href={`/${gameId}` as '/'} className="hover:text-game-primary">{gameName}</Link>
        <span>/</span>
        <Link href={`/${gameId}/items` as '/'} className="hover:text-game-primary">
          {locale === 'zh' ? '材料' : locale === 'ja' ? '素材' : 'Items'}
        </Link>
        <span>/</span>
        <span className="text-game-text">{data.name}</span>
      </nav>

      <div className="mb-6 rounded-lg border border-game-border bg-game-surface p-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-game-text">{data.name}</h1>
          {data.rarity > 0 && (
            <span className="text-sm font-bold" style={{ color: RARITY_COLORS[data.rarity] || '#888' }}>
              {'★'.repeat(data.rarity)}
            </span>
          )}
        </div>
        {data.nameAlt && <p className="mt-1 text-sm text-game-text-muted">{data.nameAlt}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {typeLabel && (
          <div className="rounded-lg border border-game-border bg-game-surface p-4">
            <div className="mb-1 text-xs text-game-text-muted">
              {locale === 'zh' ? '类型' : locale === 'ja' ? 'タイプ' : 'Type'}
            </div>
            <div className="text-sm font-medium text-game-text">{typeLabel}</div>
          </div>
        )}
        {data.source && (
          <div className="rounded-lg border border-game-border bg-game-surface p-4">
            <div className="mb-1 text-xs text-game-text-muted">
              {locale === 'zh' ? '来源' : locale === 'ja' ? '入手方法' : 'Source'}
            </div>
            <div className="text-sm text-game-text">{data.source}</div>
          </div>
        )}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: gameName, item: `https://gachia.com/${locale}/${gameId}` },
              { '@type': 'ListItem', position: 2, name: locale === 'zh' ? '材料' : locale === 'ja' ? '素材' : 'Items', item: `https://gachia.com/${locale}/${gameId}/items` },
              { '@type': 'ListItem', position: 3, name: data.name },
            ],
          }),
        }}
      />
    </div>
  );
}
