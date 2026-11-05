// Byte-identical to services/content-cms/src/desktop-guide-contract.mjs; checked in the CMS suite.
import assert from 'node:assert/strict';

export const CMS_GUIDE_ORIGIN = 'desktop-guide-v1';
export const GUIDE_TEXT_FIELDS = ['title', 'titleEn', 'titleJa', 'content', 'contentEn', 'contentJa'];
const fixed = { cmsOrigin: CMS_GUIDE_ORIGIN, category: 'general', categoryZh: '综合指南', categoryEn: 'General guides', categoryJa: '総合ガイド' };
const keys = [...Object.keys(fixed), 'id', ...GUIDE_TEXT_FIELDS, 'summary', 'summaryEn', 'summaryJa', 'tags', 'faq'].sort();

/** @param {unknown} row @param {string} [game] @param {{preview?: boolean}} [options] */
export function validateNewGuide(row, game = 'genshin', { preview = false } = {}) {
  assert(['genshin', 'nte'].includes(game), 'Unsupported new-guide game');
  // NTE drafts/isolated previews are testable, but production stays closed until
  // the locale consumer has exact Worker acceptance and installed provenance.
  assert(game !== 'nte' || preview, 'NTE additions remain preview-only until the locale Worker acceptance gate is closed');
  assert(row && typeof row === 'object' && !Array.isArray(row), 'Invalid new guide');
  assert.deepEqual(Object.keys(row).sort(), keys, 'New guide fields/media/metadata outside the reviewed contract');
  for (const [key, value] of Object.entries(fixed)) assert.equal(row[key], value, 'New guide fixed metadata changed');
  assert(typeof row.id === 'string' && /^cms-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.id) && row.id.length <= 100, 'New guide requires a bounded cms- identity');
  assert.deepEqual(row.tags, []); assert.deepEqual(row.faq, []);
  for (const field of ['titleEn', 'titleJa', 'contentEn', 'contentJa', 'summaryEn', 'summaryJa']) assert.equal(row[field], '', 'First new-guide slice is Chinese-only; translations need a separate metadata contract');
  for (const field of [...GUIDE_TEXT_FIELDS, 'summary', 'summaryEn', 'summaryJa']) {
    assert(typeof row[field] === 'string' && row[field].length <= (field.startsWith('content') ? 200000 : 300), 'Invalid new guide text budget');
    // This narrow content contract supports plain Markdown, not embedded HTML.
    assert(!/[<\u0000]/.test(row[field]), 'HTML/script markup is not supported in new guides');
  }
  assert(row.title.trim() && row.summary.trim() && row.content.trim().length >= 80, 'New guide requires complete Chinese title/summary/body');
  return row;
}

/** @param {string} game @param {{id: string, title: string, summary: string, body: string}} input */
export function newGuideSource(game, input) {
  const guide = { ...fixed, id: input.id, title: input.title, titleEn: '', titleJa: '', summary: input.summary,
    summaryEn: '', summaryJa: '', content: input.body, contentEn: '', contentJa: '', tags: [], faq: [] };
  validateNewGuide(guide, game, { preview: true });
  return { desktopGuide: 1, game, guide };
}

/** @param {unknown} source @param {string} game @param {string} id */
export function readNewGuideSource(source, game, id) {
  assert(source && typeof source === 'object' && !Array.isArray(source), 'New guide provenance required');
  assert.deepEqual(Object.keys(source).sort(), ['desktopGuide', 'game', 'guide']);
  assert.equal(source.desktopGuide, 1); assert.equal(source.game, game);
  const guide = validateNewGuide(source.guide, game, { preview: true });
  assert.equal(guide.id, id, 'New guide source identity mismatch');
  return guide;
}
