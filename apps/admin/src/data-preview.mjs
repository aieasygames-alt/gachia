import { FactError } from './facts.mjs';
import { fingerprint } from './revisions.mjs';

const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const bodyFields = { characters: 'description', weapons: 'description', materials: 'source',
  guides: 'content', 'astral-ops': 'description', 'stigma-sets': 'description' };

export function buildDataPreview(review) {
  const pages = []; const checks = []; const exclusions = [];
  let totalBytes = 0;
  for (const file of review.snapshot.contents) {
    if (!file.path.startsWith('packages/data/games/hi3/')) continue;
    if (file.deleted) { exclusions.push({ path: file.path, reason: '文件已删除，没有可预览正文；删除影响尚未验证' }); continue; }
    const kind = file.path.split('/').at(-1).slice(4, -5);
    if (!bodyFields[kind]) { exclusions.push({ path: file.path, reason: '未知数据模板，未渲染' }); continue; }
    const rows = JSON.parse(file.content);
    if (!Array.isArray(rows)) throw new FactError('数据预览要求数组数据', 409);
    const ids = new Set();
    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row) || typeof row.id !== 'string' ||
        !/^[a-z0-9-]+$/.test(row.id) || ids.has(row.id)) throw new FactError('数据预览实体 ID 无效或重复', 409);
      ids.add(row.id);
    }
    for (const row of rows) for (const locale of ['zh', 'en', 'ja']) {
      if (pages.length >= 120) throw new FactError('数据预览超过 120 页，请拆分内容批次', 409);
      const suffix = locale === 'zh' ? '' : locale === 'en' ? 'En' : 'Ja';
      const title = row[`${kind === 'guides' ? 'title' : 'name'}${suffix}`];
      const body = row[`${bodyFields[kind]}${suffix}`];
      const valid = typeof title === 'string' && Boolean(title.trim()) && typeof body === 'string' && Boolean(body.trim());
      checks.push({ ruleId: 'preview.required_text', status: valid ? 'passed' : 'failed', path: file.path,
        entityId: row.id, locale, message: '数据模板的标题与正文字段非空；不检查翻译正确性' });
      const id = fingerprint({ path: file.path, entityId: row.id, locale }).slice(0, 24);
      const safeTitle = typeof title === 'string' ? title : '缺少标题';
      const safeBody = typeof body === 'string' ? body : '缺少正文';
      const html = `<!doctype html><html lang="${locale === 'zh' ? 'zh-CN' : locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; form-action 'none'"><title>${escape(safeTitle)} · 数据级预览</title></head><body><header><p>GACHIA / DATA PREVIEW · ${locale}</p><p>本页由工作台固定模板渲染，不是真实站点路由。无脚本、图片或外部请求。</p></header><main><h1>${escape(safeTitle)}</h1><article><pre>${escape(safeBody)}</pre></article></main><footer>实体：${escape(row.id)} · 审核：${escape(review.id)}</footer></body></html>`;
      totalBytes += Buffer.byteLength(html);
      if (totalBytes > 8 * 1024 * 1024) throw new FactError('数据预览总量超过 8 MiB，请拆分批次', 409);
      pages.push({ id, entityId: row.id, locale, title: safeTitle, sourcePath: file.path, html, htmlDigest: fingerprint(html) });
    }
  }
  for (const ruleId of ['site.routes', 'site.canonical', 'site.hydration', 'site.assets', 'site.interaction', 'translation.accuracy', 'deletion.impact']) {
    checks.push({ ruleId, status: 'not_covered', message: '未执行真实应用代码或页面验收，不可作为通过依据' });
  }
  if (!pages.length) checks.push({ ruleId: 'preview.pages', status: 'not_covered', message: '无可渲染记录；空数据或删除不得视为预览通过' });
  return { mode: 'fixed_template_data_only', reviewId: review.id, packetDigest: review.packetDigest,
    pages, exclusions, checks, summary: { status: checks.some((item) => item.status === 'failed') ? 'failed' : pages.length ? 'partial_pass' : 'not_covered',
      pageCount: pages.length, browserExecuted: false, publish: false } };
}
