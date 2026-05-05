import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { nteCharacters, getNteCharacterName, getNteCharacterImage, genshinCharacters, getGenshinCharacterName, getGenshinCharacterImage } from '@gachia/data';
import { Link } from '@/lib/i18n/navigation';

const NTE_ELEMENT_COLORS: Record<string, string> = {
  anima: '#4ade80', chaos: '#8b5cf6', cosmos: '#3b82f6',
  incantation: '#f59e0b', lakshana: '#ec4899', psyche: '#06b6d4',
};

const GENSHIN_ELEMENT_COLORS: Record<string, string> = {
  pyro: '#ef4444', hydro: '#3b82f6', electro: '#8b5cf6',
  cryo: '#67e8f9', dendro: '#4ade80', anemo: '#6ee7b7', geo: '#fbbf24',
};

const GENSHIN_WEAPON_LABELS: Record<string, Record<string, string>> = {
  sword: { zh: '单手剑', en: 'Sword', ja: '片手剣' },
  claymore: { zh: '双手剑', en: 'Claymore', ja: '両手剣' },
  polearm: { zh: '长柄武器', en: 'Polearm', ja: '長柄武器' },
  bow: { zh: '弓', en: 'Bow', ja: '弓' },
  catalyst: { zh: '法器', en: 'Catalyst', ja: '法器' },
};

export default async function CharactersPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const gameId = game as GameId;
  const locale = lang as SupportedLocale;
  const gameConfig = GAMES[gameId];

  if (gameId === 'genshin') {
    return <GenshinCharactersPage locale={locale} gameId={gameId} gameConfig={gameConfig} />;
  }

  if (gameId === 'nte') {
    return <NteCharactersPage locale={locale} gameId={gameId} gameConfig={gameConfig} />;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.characters?.[locale] ?? 'Characters'}
      </h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-game-border text-sm text-game-text-muted">
          Coming Soon
        </div>
      </div>
    </div>
  );
}

// --- Genshin Characters ---

function GenshinCharactersPage({ locale, gameId, gameConfig }: { locale: SupportedLocale; gameId: GameId; gameConfig: typeof GAMES.genshin }) {
  const chars = genshinCharacters;
  const fiveStar = chars.filter((c) => c.rarity === 5);
  const fourStar = chars.filter((c) => c.rarity === 4);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.characters?.[locale] ?? 'Characters'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${chars.length} 名角色` : locale === 'ja' ? `${chars.length} 名のキャラクター` : `${chars.length} Characters`}
      </p>

      {fiveStar.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            5★ ({fiveStar.length})
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {fiveStar.map((char) => (
              <GenshinCharacterCard key={char.id} char={char} locale={locale} gameId={gameId} />
            ))}
          </div>
        </section>
      )}

      {fourStar.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            4★ ({fourStar.length})
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {fourStar.map((char) => (
              <GenshinCharacterCard key={char.id} char={char} locale={locale} gameId={gameId} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function GenshinCharacterCard({ char, locale, gameId }: { char: typeof genshinCharacters[number]; locale: SupportedLocale; gameId: GameId }) {
  const elementColor = GENSHIN_ELEMENT_COLORS[char.element] || '#888';
  const imageUrl = getGenshinCharacterImage(char);
  const weaponLabel = GENSHIN_WEAPON_LABELS[char.weaponType]?.[locale] ?? char.weaponType;

  return (
    <Link
      href={`/${gameId}/characters/${char.id}` as '/'}
      className="group flex flex-col overflow-hidden rounded-lg border border-game-border bg-game-surface transition-all hover:border-game-primary hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-game-surface-alt">
        {imageUrl ? (
          <img src={imageUrl} alt={getGenshinCharacterName(char, locale)} className="h-full w-full object-cover object-top transition-transform group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl font-bold text-game-text-muted">
            {char.nameEn.charAt(0)}
          </div>
        )}
        <span className="absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: elementColor }}>
          {char.element.charAt(0).toUpperCase() + char.element.slice(1)}
        </span>
        <span className="absolute top-1.5 right-1.5 rounded bg-game-bg/80 px-1.5 py-0.5 text-xs font-bold" style={{ color: '#eab308' }}>
          {char.rarity}★
        </span>
      </div>
      <div className="p-2.5">
        <h3 className="text-sm font-semibold text-game-text group-hover:text-game-primary truncate">
          {getGenshinCharacterName(char, locale)}
        </h3>
        <p className="text-xs text-game-text-muted truncate">{weaponLabel}</p>
      </div>
    </Link>
  );
}

// --- NTE Characters ---

function NteCharactersPage({ locale, gameId, gameConfig }: { locale: SupportedLocale; gameId: GameId; gameConfig: typeof GAMES.nte }) {
  const chars = nteCharacters;
  const sRank = chars.filter((c) => c.rank === 'S');
  const aRank = chars.filter((c) => c.rank === 'A');

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: gameConfig.theme.primary }}>
        {CATEGORY_LABELS.characters?.[locale] ?? 'Characters'}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {locale === 'zh' ? `共 ${chars.length} 名角色` : locale === 'ja' ? `${chars.length} 名のキャラクター` : `${chars.length} Characters`}
      </p>

      {sRank.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            S {locale === 'zh' ? '级' : locale === 'ja' ? '級' : '-Rank'} ({sRank.length})
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {sRank.map((char) => (
              <NteCharacterCard key={char.id} char={char} locale={locale} gameId={gameId} />
            ))}
          </div>
        </section>
      )}

      {aRank.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-game-text">
            A {locale === 'zh' ? '级' : locale === 'ja' ? '級' : '-Rank'} ({aRank.length})
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {aRank.map((char) => (
              <NteCharacterCard key={char.id} char={char} locale={locale} gameId={gameId} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function NteCharacterCard({ char, locale, gameId }: { char: typeof nteCharacters[number]; locale: SupportedLocale; gameId: GameId }) {
  const elementColor = NTE_ELEMENT_COLORS[char.attribute] || '#888';
  const imageUrl = getNteCharacterImage(char);

  return (
    <Link
      href={`/${gameId}/characters/${char.id}` as '/'}
      className="group flex flex-col overflow-hidden rounded-lg border border-game-border bg-game-surface transition-all hover:border-game-primary hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-game-surface-alt">
        {imageUrl ? (
          <img src={imageUrl} alt={getNteCharacterName(char, locale)} className="h-full w-full object-cover object-top transition-transform group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl font-bold text-game-text-muted">
            {char.nameEn.charAt(0)}
          </div>
        )}
        <span className="absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: elementColor }}>
          {char.attribute.charAt(0).toUpperCase() + char.attribute.slice(1)}
        </span>
        <span className="absolute top-1.5 right-1.5 rounded bg-game-bg/80 px-1.5 py-0.5 text-xs font-bold" style={{ color: '#eab308' }}>
          {char.rank}
        </span>
      </div>
      <div className="p-2.5">
        <h3 className="text-sm font-semibold text-game-text group-hover:text-game-primary truncate">
          {getNteCharacterName(char, locale)}
        </h3>
        <p className="text-xs text-game-text-muted truncate">{char.roleEn}</p>
      </div>
    </Link>
  );
}
