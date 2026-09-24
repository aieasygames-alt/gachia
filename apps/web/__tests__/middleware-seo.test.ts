import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const middleware = readFileSync(join(__dirname, '../middleware.ts'), 'utf8');

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
  });
});
