import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import { ChevronRight } from 'lucide-react';

import type { GameId, SupportedLocale } from '@gachia/core';

import { Link } from '@/lib/i18n/navigation';

import { CharacterAvatar } from '@/components/wiki/character-avatar';

import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

const FavoriteButton = dynamic(
  () => import('@/components/auth/favorite-button').then((m) => m.FavoriteButton),
);
import { Section, NextStepSection } from './character-detail-shared';

import {
  getRocoCharacterById,
  getRocoCharacterImage,
} from '@gachia/data/games/roco/characters';

import {
  getRocoCnCharacterById,
  getRocoCnCharacterImage,
} from '@gachia/data/games/roco-cn/characters';

// ============================================================
// Roco Kingdom Jinie Detail
// ============================================================

const ROCO_ELEMENT_COLORS: Record<string, string> = {
  grass: '#4ade80',
  fire: '#f97316',
  water: '#38bdf8',
  electric: '#facc15',
  normal: '#a3a3a3',
  ice: '#7dd3fc',
  poison: '#a78bfa',
  ground: '#d97706',
  flying: '#93c5fd',
  bug: '#84cc16',
  light: '#fde047',
  dark: '#64748b',
};

const ROCO_ELEMENT_NAMES: Record<string, Record<SupportedLocale, string>> = {
  grass: { zh: '草', en: 'Grass', ja: 'くさ' },
  fire: { zh: '火', en: 'Fire', ja: 'ほのお' },
  water: { zh: '水', en: 'Water', ja: 'みず' },
  electric: { zh: '电', en: 'Electric', ja: 'でんき' },
  normal: { zh: '普通', en: 'Normal', ja: 'ノーマル' },
  ice: { zh: '冰', en: 'Ice', ja: 'こおり' },
  poison: { zh: '毒', en: 'Poison', ja: 'どく' },
  ground: { zh: '地面', en: 'Ground', ja: 'じめん' },
  flying: { zh: '飞行', en: 'Flying', ja: 'ひこう' },
  bug: { zh: '虫', en: 'Bug', ja: 'むし' },
  light: { zh: '光', en: 'Light', ja: 'ひかり' },
  dark: { zh: '暗', en: 'Dark', ja: 'あく' },
};

interface JinieLike {
  id: string;
  number: string;
  name: string;
  nameEn: string;
  nameJa?: string;
  attribute: string;
  attributeEn: string;
  rarity: number;
  habitat: string;
  habitatEn: string;
  evolution: string;
  evolutionEn: string;
  description: string;
  descriptionEn: string;
  status: string;
}

function localeStr(zh: string, en: string, locale: SupportedLocale, ja?: string): string {
  if (locale === 'en') return en;
  if (locale === 'ja') return ja ?? en;
  return zh;
}

function JinieDetail({
  char,
  locale,
  gameId,
  imageUrl,
}: {
  char: JinieLike;
  locale: SupportedLocale;
  gameId: GameId;
  imageUrl: string;
}) {
  const gameConfig = GAMES[gameId];
  const charName = localeStr(char.name, char.nameEn, locale, char.nameJa);
  const elementName = ROCO_ELEMENT_NAMES[char.attribute]?.[locale] ?? char.attributeEn;

  return (
    <div>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-1 text-sm text-game-text-muted">
          <li className="flex items-center gap-1">
            <Link href="/" className="hover:text-game-primary transition-colors">{locale === 'zh' ? '首页' : 'Home'}</Link>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li className="flex items-center gap-1">
            <Link href={`/${gameId}`} className="hover:text-game-primary transition-colors">{gameConfig.name[locale]}</Link>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li className="flex items-center gap-1">
            <Link href={`/${gameId}/characters`} className="hover:text-game-primary transition-colors">{CATEGORY_LABELS.characters?.[locale] ?? 'Characters'}</Link>
            <ChevronRight className="h-3 w-3" />
          </li>
          <li><span className="text-game-text">{charName}</span></li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-6 md:flex-row">
        <div className="shrink-0 overflow-hidden rounded-lg border border-game-border bg-game-surface">
          <CharacterAvatar
            src={imageUrl}
            alt={charName}
            element={char.attribute}
            className="h-64 w-64 object-cover object-top"
          />
        </div>
        <div className="flex-1">
          <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
            {charName}
          </h1>
          <div className="mb-3">
            <FavoriteButton gameId={gameId} characterId={char.id} />
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded px-2 py-0.5 text-sm font-medium text-white" style={{ backgroundColor: ROCO_ELEMENT_COLORS[char.attribute] ?? '#888' }}>
              {elementName}
            </span>
            <span className="rounded bg-game-surface-alt px-2 py-0.5 text-sm font-bold" style={{ color: '#eab308' }}>
              {'★'.repeat(char.rarity)}
            </span>
            {char.number && (
              <span className="rounded bg-game-surface-alt px-2 py-0.5 text-sm text-game-text-muted">
                #{char.number}
              </span>
            )}
          </div>
          <p className="mb-3 text-sm leading-relaxed text-game-text-muted">
            {localeStr(char.description, char.descriptionEn, locale)}
          </p>
        </div>
      </div>

      {/* Attributes */}
      <Section title={locale === 'zh' ? '基本信息' : locale === 'ja' ? '基本情報' : 'Profile'}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-game-border bg-game-surface p-4">
            <div className="mb-1 text-xs text-game-text-muted">
              {locale === 'zh' ? '栖息地' : locale === 'ja' ? '生息地' : 'Habitat'}
            </div>
            <div className="text-sm text-game-text">
              {localeStr(char.habitat, char.habitatEn, locale)}
            </div>
          </div>
          <div className="rounded-lg border border-game-border bg-game-surface p-4">
            <div className="mb-1 text-xs text-game-text-muted">
              {locale === 'zh' ? '进化' : locale === 'ja' ? '進化' : 'Evolution'}
            </div>
            <div className="text-sm text-game-text">
              {localeStr(char.evolution, char.evolutionEn, locale)}
            </div>
          </div>
        </div>
      </Section>

      <NextStepSection locale={locale} gameId={gameId} />

      {/* Back */}
      <div className="border-t border-game-border pt-4">
        <Link href={`/${gameId}/characters`} className="text-sm text-game-primary transition-colors hover:text-game-accent">
          {locale === 'zh' ? '← 返回精灵列表' : locale === 'ja' ? '← ジニー一覧に戻る' : '← Back to Jinies'}
        </Link>
      </div>
    </div>
  );
}

export function RocoCharacterDetailPage({ id, locale }: { id: string; locale: SupportedLocale }) {
  const char = getRocoCharacterById(id);
  if (!char) notFound();
  return <JinieDetail char={char} locale={locale} gameId="roco" imageUrl={getRocoCharacterImage(char)} />;
}

export function RocoCnCharacterDetailPage({ id, locale }: { id: string; locale: SupportedLocale }) {
  const char = getRocoCnCharacterById(id);
  if (!char) notFound();
  return <JinieDetail char={char} locale={locale} gameId="roco-cn" imageUrl={getRocoCnCharacterImage(char)} />;
}
