import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '../../..');

function readProjectFile(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

describe('game registration', () => {
  it('keeps lvmeng out of the main worker non-localized matcher', () => {
    const middleware = readProjectFile('apps/web/middleware.ts');

    expect(middleware).toContain("'/(zh|en|ja)/:path*'");
    expect(middleware).not.toContain('|lvmeng)');
  });

  it('returns 404 instead of localized main-worker fallback pages for lvmeng', () => {
    const middleware = readProjectFile('apps/web/middleware.ts');

    expect(middleware).toContain("if (game === 'lvmeng')");
    expect(middleware).toContain("locale === 'zh'");
    expect(middleware).toContain('return new NextResponse(null, { status: 404 });');
  });

  it('does not infer IndexNow URLs for every game from a shared source template', () => {
    const script = readProjectFile('scripts/indexnow-submit-new-pages.mjs');

    expect(script).toContain("from './indexnow-plan.mjs'");
    expect(script).toContain('runIndexNowPlan(process.argv.slice(2)');
    expect(script).not.toMatch(/GAME_IDS|gitAddedFiles|routeFromAddedFile|fetch\(/);
  });

  it('keeps authenticated user APIs aligned with core games', () => {
    const apiFiles = [
      'apps/web/app/api/favorites/route.ts',
      'apps/web/app/api/user-characters/route.ts',
      'apps/web/app/api/shared-builds/route.ts',
    ];

    for (const file of apiFiles) {
      const source = readProjectFile(file);
      expect(source, `${file} should import core game ids`).toContain("import { GAME_IDS } from '@gachia/core'");
      expect(source, `${file} should not keep a stale literal game enum`).not.toMatch(/z\.enum\(\['genshin'/);
    }
  });
});
