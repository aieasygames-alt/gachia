import { expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

it('keeps a localized accessible name when the mobile search text is hidden', async () => {
  const source = await readFile(join(process.cwd(), 'components/layout/site-header.tsx'), 'utf8');
  expect(source).toContain("aria-label={mounted ? (locale === 'zh' ? '搜索' : locale === 'ja' ? '検索' : 'Search')");
  expect(source).toContain('disabled={!mounted}');
  expect(source).toContain('aria-busy={!mounted}');
  expect(source).toContain('検索を準備中');
  expect(source).toContain("useState<'search' | 'auth' | null>(null)");
  expect(source).toContain('<SearchLoader');
  expect(source).toContain("modal === null");
  expect(source).toContain('gap-2 px-3 sm:gap-4 sm:px-4');
});

it('allows the search input and long result names to shrink on narrow screens', async () => {
  const source = await readFile(join(process.cwd(), 'components/search/search-dialog.tsx'), 'utf8');
  expect(source).toContain('min-w-0 flex-1 bg-transparent');
  expect(source).toContain('min-w-0 break-words text-sm');
  expect(source).toContain('onClick={onClose} aria-hidden="true"');
  expect(source).toContain('該当する結果がありません');
  expect(source).toContain("e.key !== 'Tab'");
  expect(source).toContain('previous?.isConnected');
  expect(source).toContain('isolateModalBackground(overlayRef.current)');
  expect(source).toContain('restoreBackground(); if (previous?.isConnected)');
  expect(source).toContain('ref={overlayRef}');
  expect(source).toContain('moveSearchFocus(e, dialogRef.current, inputRef.current)');
  expect(source).toContain('data-search-result');
  expect(source).toContain('aria-atomic="true"');
  expect(source).toContain('最大30件');
  expect(source).toContain('focus-visible:outline-game-primary');
});
