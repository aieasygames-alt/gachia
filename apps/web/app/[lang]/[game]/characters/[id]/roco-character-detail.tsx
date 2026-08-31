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

import type { RocoCnSkill, RocoCnStats } from '@gachia/data/games/roco-cn/types';

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
  psychic: '#f472b6',
  fairy: '#f9a8d4',
  dragon: '#7c3aed',
  steel: '#94a3b8',
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
  psychic: { zh: '幻', en: 'Psychic', ja: 'エスパー' },
  fairy: { zh: '仙', en: 'Fairy', ja: 'フェアリー' },
  dragon: { zh: '龙', en: 'Dragon', ja: 'ドラゴン' },
  steel: { zh: '机械', en: 'Steel', ja: 'はがね' },
};

const ROCO_SKILL_CATEGORY_LABELS: Record<string, Record<SupportedLocale, string>> = {
  physical: { zh: '物理', en: 'Physical', ja: '物理' },
  magic: { zh: '魔法', en: 'Magic', ja: '魔法' },
  status: { zh: '属性', en: 'Status', ja: '変化' },
  defense: { zh: '防御', en: 'Defense', ja: '防衛' },
};

const ROCO_STAT_LABELS: Record<SupportedLocale, Record<string, string>> = {
  zh: { total: '总和', hp: '精力', atk: '攻击', matk: '魔攻', def: '防御', mdef: '魔抗', spd: '速度' },
  en: { total: 'Total', hp: 'HP', atk: 'Attack', matk: 'M.Atk', def: 'Defense', mdef: 'M.Def', spd: 'Speed' },
  ja: { total: '合計', hp: 'HP', atk: '攻撃', matk: '魔攻', def: '防御', mdef: '魔防', spd: 'すばやさ' },
};

const ROCO_STAT_MAX = 200;

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
  skills?: RocoCnSkill[];
  stats?: RocoCnStats;
  releaseVersion?: string;
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
            {char.releaseVersion && (
              <span className="rounded bg-game-surface-alt px-2 py-0.5 text-sm text-game-text-muted">
                {char.releaseVersion}
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

      {/* Stats (base stats / racial values) */}
      {char.stats && (
        <Section title={locale === 'zh' ? '种族值' : locale === 'ja' ? '種族値' : 'Base Stats'}>
          <div className="rounded-lg border border-game-border bg-game-surface p-4">
            <div className="mb-4 flex items-baseline justify-between">
              <span className="text-xs text-game-text-muted">
                {ROCO_STAT_LABELS[locale].total}
              </span>
              <span className="text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
                {char.stats.total}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(['hp', 'atk', 'matk', 'def', 'mdef', 'spd'] as const).map((key) => {
                const value = char.stats?.[key];
                if (value === undefined) return null;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-14 shrink-0 text-xs text-game-text-muted">
                      {ROCO_STAT_LABELS[locale][key]}
                    </span>
                    <span className="w-10 shrink-0 text-right text-sm font-semibold text-game-text">
                      {value}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-game-surface-alt">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (value / ROCO_STAT_MAX) * 100)}%`,
                          backgroundColor: ROCO_ELEMENT_COLORS[char.attribute] ?? '#888',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Section>
      )}

      {/* Skills */}
      {char.skills && char.skills.length > 0 && (
        <Section title={locale === 'zh' ? '技能表' : locale === 'ja' ? 'スキル一覧' : 'Skills'}>
          <div className="overflow-x-auto rounded-lg border border-game-border bg-game-surface">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-game-border text-left text-xs text-game-text-muted">
                  <th className="px-3 py-2">{locale === 'zh' ? '等级' : locale === 'ja' ? 'Lv' : 'Lv'}</th>
                  <th className="px-3 py-2">{locale === 'zh' ? '技能' : locale === 'ja' ? 'スキル' : 'Skill'}</th>
                  <th className="px-3 py-2">{locale === 'zh' ? '系别' : locale === 'ja' ? 'タイプ' : 'Type'}</th>
                  <th className="px-3 py-2">{locale === 'zh' ? '分类' : locale === 'ja' ? '分類' : 'Category'}</th>
                  <th className="px-3 py-2">{locale === 'zh' ? '威力' : locale === 'ja' ? '威力' : 'Power'}</th>
                </tr>
              </thead>
              <tbody>
                {char.skills.map((skill, idx) => (
                  <tr key={`${skill.nameEn}-${idx}`} className="border-b border-game-border/50 last:border-b-0">
                    <td className="whitespace-nowrap px-3 py-2 text-game-text-muted">
                      {skill.level !== undefined ? `Lv.${skill.level}` : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-game-text">
                        {localeStr(skill.name, skill.nameEn, locale)}
                      </div>
                      <div className="mt-0.5 text-xs text-game-text-muted">
                        {localeStr(skill.description, skill.descriptionEn, locale)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span
                        className="rounded px-1.5 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: ROCO_ELEMENT_COLORS[skill.element] ?? '#888' }}
                      >
                        {ROCO_ELEMENT_NAMES[skill.element]?.[locale] ?? skill.element}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-game-text-muted">
                      {ROCO_SKILL_CATEGORY_LABELS[skill.category]?.[locale] ?? skill.category}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-game-text-muted">
                      {skill.power !== undefined ? skill.power : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

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

export async function RocoCharacterDetailPage({ id, locale }: { id: string; locale: SupportedLocale }) {
  const { getRocoCharacterById, getRocoCharacterImage } = await import('@gachia/data/games/roco/characters');
  const char = getRocoCharacterById(id);
  if (!char) notFound();
  return <JinieDetail char={char} locale={locale} gameId="roco" imageUrl={getRocoCharacterImage(char)} />;
}

export async function RocoCnCharacterDetailPage({ id, locale }: { id: string; locale: SupportedLocale }) {
  const { getRocoCnCharacterById, getRocoCnCharacterImage } = await import('@gachia/data/games/roco-cn/characters');
  const char = getRocoCnCharacterById(id);
  if (!char) notFound();
  return <JinieDetail char={char} locale={locale} gameId="roco-cn" imageUrl={getRocoCnCharacterImage(char)} />;
}
