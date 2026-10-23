import { expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as jsxRuntime from 'react/jsx-runtime';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { isContentUnderReview, isEditorialProposalArchive } from '@/lib/seo-metadata';
import { getGuideListData } from '@/lib/game-data/guides';
import sitemap from '@/app/sitemaps/main/sitemap';

// Match the existing TSX contract-test approach without changing Next's JSX mode.
const compiled = ts.transpileModule(readFileSync(new URL('../components/wiki/content-review-notice.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
}).outputText;
const component: { ContentReviewNotice?: (props: { locale: 'zh' | 'en' | 'ja'; reviewedAt: string; proposalArchive?: boolean }) => ReturnType<typeof createElement> } = {};
new Function('require', 'exports', compiled)((name: string) => {
  if (name === 'react/jsx-runtime') return jsxRuntime;
  throw new Error(`Unexpected review notice dependency: ${name}`);
}, component);

it('does not interpret an arbitrary kind as an active editorial archive policy', () => {
  for (const value of [null, undefined, [], {}, { contentReview: null }, { contentReview: { kind: 'editorial_proposal_archive' } }, { contentReview: { status: 'verified', kind: 'editorial_proposal_archive' } }, { contentReview: { status: 'needs_verification', kind: 'unknown_kind' } }]) {
    expect(isEditorialProposalArchive(value)).toBe(false);
  }
  expect(isEditorialProposalArchive({ contentReview: { status: 'needs_verification', kind: 'editorial_proposal_archive' } })).toBe(true);
  expect(isEditorialProposalArchive({ contentReview: { status: 'needs_verification' } })).toBe(false);
});

it.each(['zh', 'en', 'ja'] as const)('keeps archive and checklist list states separate in %s', async locale => {
  const { guides } = await getGuideListData('roco', locale);
  expect(guides).toHaveLength(30);
  expect(guides.filter(isContentUnderReview)).toHaveLength(30);
  expect(guides.filter(isEditorialProposalArchive)).toHaveLength(17);
  expect(guides.filter(row => !isEditorialProposalArchive(row))).toHaveLength(13);
  expect(guides.filter(isEditorialProposalArchive).every(row => row.category === 'editorial-archive')).toBe(true);
  const html = renderToStaticMarkup(createElement(component.ContentReviewNotice!, { locale, reviewedAt: '2026-10-24', proposalArchive: true }));
  expect(html).toContain('data-content-review="editorial_proposal_archive"');
  expect(html).toContain({ zh: '不是玩家攻略', en: 'not a player guide', ja: 'プレイヤー攻略' }[locale]);
  const correction = renderToStaticMarkup(createElement(component.ContentReviewNotice!, { locale, reviewedAt: '2026-10-24' }));
  expect(correction).not.toContain('data-content-review="editorial_proposal_archive"');
  expect(correction).toContain({ zh: '资料待核实', en: 'Information under review', ja: '資料確認中' }[locale]);
  const cn = await getGuideListData('roco-cn', locale);
  expect(cn.guides.some(isEditorialProposalArchive)).toBe(false);
  const urls = new Set((await sitemap()).map(row => row.url));
  for (const guide of guides) expect(urls.has(`https://gachia.com/${locale}/roco/guides/${guide.id}`)).toBe(false);
  expect(urls.has(`https://gachia.com/${locale}/roco/guides`)).toBe(true);
  expect(urls.has(`https://gachia.com/${locale}/roco/version`)).toBe(true);
});
