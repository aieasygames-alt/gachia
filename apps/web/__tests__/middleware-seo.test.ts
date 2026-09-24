import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const middleware = readFileSync(join(__dirname, '../middleware.ts'), 'utf8');
const charactersPage = readFileSync(join(__dirname, '../app/[lang]/[game]/characters/page.tsx'), 'utf8');
const weaponsPage = readFileSync(join(__dirname, '../app/[lang]/[game]/weapons/page.tsx'), 'utf8');

describe('SEO redirect contracts', () => {
  it('removes search placeholder URLs from the indexable URL set', () => {
    expect(middleware).toContain("if (locale && secondSegment === 'search')");
    expect(middleware).toContain('return redirectTo(request, `/${locale}`, true);');
  });

  it('keeps language-less and unsupported game routes out of the canonical URL set', () => {
    expect(middleware).toContain("const DEFAULT_CANONICAL_LOCALE: LocaleId = 'zh';");
    expect(middleware).toContain('return redirectTo(request, `/${targetLocale}${pathname}`);');
    expect(middleware).toContain("sea: ['weapons', 'artifacts', 'drive-discs', 'disk-sets'");
    expect(middleware).toContain("nte: ['characters', 'weapons', 'items', 'tier-list'");
    expect(middleware).toContain("zzz: ['characters', 'weapons', 'items', 'tier-list'");
    expect(middleware).toContain('isUnsupportedGameRoute(game, thirdSegment)');
    expect(middleware).toContain('LEGACY_ROOT_ROUTES');
    expect(middleware).toContain('stripLabelSuffix(fourthSegment)');
    expect(middleware).toContain("fourthSegment === 'harmony-trailblazer'");
  });

  it('does not render empty weapon databases as indexable placeholder pages', () => {
    expect(weaponsPage).toContain("import { notFound } from 'next/navigation';");
    expect(weaponsPage).toContain("if (gameId === 'sea') notFound();");
    expect(weaponsPage).toContain('if (weapons.length > 0) return');
    expect(weaponsPage).toContain('  notFound();');
    expect(weaponsPage).not.toContain('>Coming Soon</div>');
  });

  it('does not render empty character databases as indexable placeholder pages', () => {
    expect(charactersPage).toContain("import { notFound } from 'next/navigation';");
    expect(charactersPage).toContain('if (chars.length > 0)');
    expect(charactersPage).toContain('  notFound();');
    expect(charactersPage).not.toContain('>Coming Soon</div>');
  });
});
