import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

describe('ZZZ server-rendered tool heading contract', () => {
  for (const [tool, titles] of [
    ['build', ['绝区零代理人配装推荐', 'ゼンレスゾーンゼロ エージェントビルド', 'Zenless Zone Zero Agent Builds']],
    ['compare', ['绝区零代理人对比', 'ゼンレスゾーンゼロ エージェント比較', 'Zenless Zone Zero Agent Comparison']],
  ] as const) {
    it(`keeps a localized visible H1 in the server page: ${tool}`, async () => {
      const source = await readFile(join(process.cwd(), `app/[lang]/[game]/${tool}/page.tsx`), 'utf8');
      expect(source.match(/<h1\b/g)).toHaveLength(1);
      expect(source).toContain("gameId === 'zzz' && (");
      expect(source).not.toContain('sr-only');
      for (const title of titles) expect(source).toContain(title);
      expect(source.indexOf('<h1')).toBeLessThan(source.indexOf(tool === 'build' ? '<BuildClient' : '<CompareClient'));
    });
  }
});
