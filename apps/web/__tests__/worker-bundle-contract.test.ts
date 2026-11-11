import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';

it('loads dashboard guide bodies through ASSETS instead of bundling duplicate JSON', async () => {
  const page = await readFile(join(process.cwd(), 'app/[lang]/tools/market-intel/page.tsx'), 'utf8');
  const reader = await readFile(join(process.cwd(), 'lib/market-intel-freshness.ts'), 'utf8');
  expect(page).not.toMatch(/import\s+\w+\s+from\s+['"][^'"]*raw-guides\.json/);
  expect(reader).toContain('loadJson<FreshnessGuide[]>');
  expect(reader).toContain("if (gameId === 'genshin')");
  expect(reader).toContain('await getGenshinFreshnessGuides()');
  expect(page).toContain("export const dynamic = 'force-dynamic'");
  expect(page).toContain('await getDashboardFreshnessFindings()');
  expect(await readFile(join(process.cwd(), 'wrangler.jsonc'), 'utf8')).toMatch(/"minify":\s*true/);
});
