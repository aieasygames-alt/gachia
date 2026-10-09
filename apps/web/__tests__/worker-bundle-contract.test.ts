import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';

it('loads dashboard guide bodies through ASSETS instead of bundling duplicate JSON', async () => {
  const page = await readFile(join(process.cwd(), 'app/[lang]/tools/market-intel/page.tsx'), 'utf8');
  expect(page).not.toMatch(/import\s+\w+\s+from\s+['"][^'"]*raw-guides\.json/);
  expect(page).toContain('loadJson<FreshnessGuide[]>');
  expect(page).toContain('await getDashboardFreshnessFindings()');
  expect(await readFile(join(process.cwd(), 'wrangler.jsonc'), 'utf8')).toMatch(/"minify":\s*true/);
});
