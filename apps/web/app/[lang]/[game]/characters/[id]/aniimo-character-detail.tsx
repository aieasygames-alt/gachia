import { CATEGORY_LABELS, GAMES } from '@gachia/core';
import type { SupportedLocale } from '@gachia/core';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/navigation';
import { CharacterAvatar } from '@/components/wiki/character-avatar';
import {
  getAniimoCharacterById,
  getAniimoCharacterImage,
  getAniimoCharacterName,
  getAniimoCharacterDescription,
  getAniimoCharacterTierReason,
} from '@gachia/data/games/aniimo/characters';

function label(locale: SupportedLocale, zh: string, en: string, ja = en) {
  return locale === 'zh' ? zh : locale === 'ja' ? ja : en;
}

export function AniimoCharacterDetailPage({ id, locale }: { id: string; locale: SupportedLocale }) {
  const char = getAniimoCharacterById(id);
  if (!char) notFound();

  const game = GAMES.aniimo;
  const charName = getAniimoCharacterName(char, locale);
  const elementLabel = locale === 'zh' ? char.elementZh : locale === 'ja' ? char.elementJa : char.elementEn;
  const roleLabel = locale === 'zh' ? char.roleZh : locale === 'ja' ? char.roleJa : char.roleEn;
  const facts = [
    [label(locale, '编号', 'No.', 'No.'), char.no],
    [label(locale, '元素', 'Element'), elementLabel],
    [label(locale, '定位', 'Role'), roleLabel],
    [label(locale, '阶段', 'Stage'), char.stage],
    [label(locale, '区域', 'Region'), char.region],
    [label(locale, '状态', 'Status'), char.status],
  ];

  return (
    <article className="space-y-8">
      <nav className="flex items-center gap-2 text-sm text-game-text-muted">
        <Link href="/aniimo" className="hover:text-game-primary">Aniimo</Link>
        <span>/</span>
        <Link href="/aniimo/characters" className="hover:text-game-primary">
          {CATEGORY_LABELS.characters?.[locale] ?? 'Characters'}
        </Link>
        <span>/</span>
        <span className="text-game-text">{charName}</span>
      </nav>

      <section className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="overflow-hidden rounded-lg border border-game-border bg-game-surface">
          <div className="aspect-square bg-game-surface-alt">
            <CharacterAvatar
              src={getAniimoCharacterImage(char)}
              alt={charName}
              element={char.element}
              className="h-full w-full object-cover object-top"
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium" style={{ color: game.theme.primary }}>
            Aniimo Wiki
          </p>
          <h1 className="mb-3 text-3xl font-bold text-game-text">{charName}</h1>
          <p className="mb-5 max-w-3xl text-sm leading-relaxed text-game-text-muted">
            {getAniimoCharacterDescription(char, locale)}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {facts.map(([title, value]) => (
              <div key={title} className="rounded-lg border border-game-border bg-game-surface p-3">
                <div className="text-xs text-game-text-muted">{title}</div>
                <div className="mt-1 text-sm font-semibold text-game-text">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <InfoPanel title={label(locale, '能力用途', 'Ability')}>
          {char.abilityUseCase || char.ability}
        </InfoPanel>
        <InfoPanel title={label(locale, '位置提示', 'Location Note')}>
          {char.locationNote || char.relatedRegionReason || label(locale, '上线后补充精确路线。', 'Exact route notes will be verified after launch.')}
        </InfoPanel>
        <InfoPanel title={label(locale, '强度备注', 'Tier Note')}>
          {getAniimoCharacterTierReason(char, locale)}
        </InfoPanel>
      </section>

      {(char.evolution.length > 0 || char.evolutionDetail) && (
        <section className="rounded-lg border border-game-border bg-game-surface p-5">
          <h2 className="mb-3 text-lg font-semibold text-game-text">
            {label(locale, '进化与形态', 'Evolution and Forms')}
          </h2>
          {char.evolution.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {char.evolution.map((entry) => (
                <span key={entry} className="rounded bg-game-surface-alt px-2 py-1 text-sm text-game-text">
                  {entry}
                </span>
              ))}
            </div>
          )}
          <p className="text-sm leading-relaxed text-game-text-muted">
            {char.evolutionDetail || label(locale, '形态细节等待上线后确认。', 'Form details are awaiting launch verification.')}
          </p>
        </section>
      )}

      <section className="rounded-lg border border-game-border bg-game-surface p-5">
        <h2 className="mb-3 text-lg font-semibold text-game-text">
          {label(locale, '来源状态', 'Source Status')}
        </h2>
        <p className="text-sm leading-relaxed text-game-text-muted">
          {char.sourceNote || label(locale, '该条目来自公开资料追踪，精确数值和路线将在正式上线后复核。', 'This entry is tracked from public sources. Exact values and routes will be rechecked after launch.')}
        </p>
      </section>
    </article>
  );
}

function InfoPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-game-border bg-game-surface p-4">
      <h2 className="mb-2 text-base font-semibold text-game-text">{title}</h2>
      <p className="text-sm leading-relaxed text-game-text-muted">{children}</p>
    </section>
  );
}
