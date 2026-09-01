import { GAMES, LOCALES, CATEGORY_LABELS } from '@gachia/core';

import { ChevronRight } from 'lucide-react';

import type { GameId, SupportedLocale } from '@gachia/core';

import { notFound } from 'next/navigation';

import { buildCharacterJsonLd } from '@/lib/jsonld';

import { getCharacterMetaData, getCharactersForStaticParams } from '@/lib/game-data/characters';

import { Link } from '@/lib/i18n/navigation';

import { CharacterAvatar } from '@/components/wiki/character-avatar';

import { CHARACTER_META_OVERRIDES } from './character-detail-shared';
import { ensureMetaLength } from '@/lib/seo-metadata';

export const dynamicParams = false;


type Props = {
  params: Promise<{ lang: string; game: string; id: string }>;
};

function validateGameId(game: string): GameId {
  if (game in GAMES) return game as GameId;
  notFound();
}

function validateLocale(lang: string): SupportedLocale {
  if (LOCALES.includes(lang as SupportedLocale)) return lang as SupportedLocale;
  return 'zh';
}

export async function generateStaticParams() {
  const gameIds = ['nte', 'genshin', 'starrail', 'wuwa', 'zzz', 'guihuan', 'ananta', 'endfield', 'sea', 'roco', 'roco-cn', 'aniimo'] as const;
  const entries = await Promise.all(
    gameIds.map(async (gameId) => ({
      gameId,
      characters: await getCharactersForStaticParams(gameId),
    })),
  );

  return entries.flatMap(({ gameId, characters }) =>
    LOCALES.flatMap((lang) => characters.map((char) => ({ lang, game: gameId, id: char.id }))),
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
  const meta = await getCharacterMetaData(gameId, id, locale);
  if (!meta) return {};

  const gameName = GAMES[gameId]?.name[locale] ?? gameId;
  const override = CHARACTER_META_OVERRIDES[`${gameId}/${id}`]?.[locale];
  const alternates = {
    canonical: `https://gachia.com/${locale}/${gameId}/characters/${id}`,
    languages: {
      'zh-Hans': `https://gachia.com/zh/${gameId}/characters/${id}`,
      en: `https://gachia.com/en/${gameId}/characters/${id}`,
      ja: `https://gachia.com/ja/${gameId}/characters/${id}`,
      'x-default': `https://gachia.com/zh/${gameId}/characters/${id}`,
    },
  };
  const openGraph = {
    title: meta.name,
    images: [{ url: `/images/og/${gameId}.webp`, width: 1200, height: 630, alt: meta.name }],
    locale: locale === 'zh' ? 'zh_CN' : locale === 'ja' ? 'ja_JP' : 'en_US',
  };

  if (override) return { ...override, openGraph, alternates };

  const roleParts = [meta.elementLabel, meta.weaponLabel, meta.pathLabel, meta.specialtyLabel].filter(Boolean).join(' ');
  const title = locale === 'zh'
    ? `${meta.name}配装攻略 — ${gameName}角色、武器与配队推荐`
    : locale === 'ja'
      ? `${meta.name}ビルド攻略 — ${gameName}キャラ・武器・編成`
      : `${meta.name} Build Guide — ${gameName} Character, Weapons & Teams`;
  const baseDescription = locale === 'zh'
    ? `${meta.name}${roleParts ? `（${roleParts}）` : ''}配装攻略：角色定位、推荐武器、套装、材料、技能、配队和培养优先级。${meta.tierRank ? `${meta.tierRank} Tier。` : ''}`
    : locale === 'ja'
      ? `${meta.name}${roleParts ? ` (${roleParts})` : ''} のビルド攻略。役割、武器、セット、素材、スキル、編成、育成優先度を整理。${meta.tierRank ? `${meta.tierRank} Tier.` : ''}`
      : `${meta.name}${roleParts ? ` (${roleParts})` : ''} build guide for ${gameName}: role, best weapons, sets, materials, skills, teams, and investment priority. ${meta.tierRank ? `${meta.tierRank} tier.` : ''}`;
  const description = ensureMetaLength(
    baseDescription.length >= 120 ? baseDescription : `${baseDescription} ${meta.description}`,
    locale,
  );

  return { title, description, openGraph, alternates };
}
export default async function CharacterDetailPage({ params }: Props) {
  const { lang, game, id } = await params;
  const gameId = validateGameId(game);
  const locale = validateLocale(lang);

  switch (gameId) {
    case 'genshin': {
      const mod = await import('./genshin-character-detail');
      return <mod.GenshinCharacterDetailPage id={id} locale={locale} />;
    }
    case 'starrail': {
      const mod = await import('./starrail-character-detail');
      return <mod.StarRailCharacterDetailPage id={id} locale={locale} />;
    }
    case 'nte': {
      const mod = await import('./nte-character-detail');
      return <mod.NteCharacterDetailPage id={id} locale={locale} />;
    }
    case 'wuwa': {
      const mod = await import('./wuwa-character-detail');
      return <mod.WuWaCharacterDetailPage id={id} locale={locale} />;
    }
    case 'zzz': {
      const mod = await import('./zzz-character-detail');
      return <mod.ZzzCharacterDetailPage id={id} locale={locale} />;
    }
    case 'guihuan': {
      const mod = await import('./guihuan-character-detail');
      return <mod.GuihuanCharacterDetailPage id={id} locale={locale} />;
    }
    case 'ananta': {
      const mod = await import('./ananta-character-detail');
      return <mod.AnantaCharacterDetailPage id={id} locale={locale} />;
    }
    case 'endfield': {
      const mod = await import('./endfield-character-detail');
      return <mod.EndfieldCharacterDetailPage id={id} locale={locale} />;
    }
    case 'sea': {
      const mod = await import('./sea-character-detail');
      return <mod.SeaCharacterDetailPage id={id} locale={locale} />;
    }
    case 'roco':
    case 'roco-cn': {
      const mod = await import('./roco-character-detail');
      return gameId === 'roco'
        ? <mod.RocoCharacterDetailPage id={id} locale={locale} />
        : <mod.RocoCnCharacterDetailPage id={id} locale={locale} />;
    }
    case 'aniimo': {
      const mod = await import('./aniimo-character-detail');
      return <mod.AniimoCharacterDetailPage id={id} locale={locale} />;
    }
    default:
      notFound();
  }
}
