import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GAME_IDS } from '@gachia/core';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '../../..');

function readProjectFile(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

describe('game registration', () => {
  it('keeps middleware route matching aligned with core games', () => {
    const middleware = readProjectFile('apps/web/middleware.ts');

    for (const gameId of GAME_IDS) {
      expect(middleware, `${gameId} should be matched by middleware`).toContain(gameId);
    }
  });

  it('keeps IndexNow new-page submission aligned with core games', () => {
    const script = readProjectFile('scripts/indexnow-submit-new-pages.mjs');

    expect(script).toContain("import { GAME_IDS } from '@gachia/core'");
    expect(script).not.toMatch(/const GAMES = \[[^\]]+\]/);
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
