import { FactError } from './facts.mjs';
import { fingerprint } from './revisions.mjs';

const routes = { characters: 'characters', weapons: 'weapons', materials: 'items', guides: 'guides' };
function entities(content) {
  const rows = JSON.parse(content);
  if (!Array.isArray(rows)) throw new FactError('实体差异要求数组数据');
  const result = new Map();
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row) || typeof row.id !== 'string' ||
      !/^[a-z0-9-]+$/.test(row.id) || result.has(row.id)) throw new FactError('实体 ID 无效或重复');
    result.set(row.id, row);
  }
  return result;
}
export function affectedPages(review, maxPages = 60) {
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 60) throw new FactError('受影响页面预算必须为1至60的整数');
  const pages = new Map(); const changes = []; const notCovered = [];
  const add = (path, kind, extra = {}) => pages.set(path, { ...pages.get(path), path, kind, ...extra });
  for (const locale of ['zh', 'en', 'ja']) add(`/${locale}/hi3`, 'home');
  for (const file of review.snapshot?.contents ?? []) {
    if (!file.path.startsWith('packages/data/games/hi3/')) continue;
    const kind = file.path.split('/').at(-1).slice(4, -5);
    if (!routes[kind]) { notCovered.push({ path: file.path, reason: '未配置页面映射' }); continue; }
    if (typeof file.baselineContent !== 'string') {
      notCovered.push({ path: file.path, reason: '旧审核缺少基线正文，需重新生成审核材料；不猜测受影响实体' }); continue;
    }
    const before = entities(file.baselineContent);
    const after = entities(file.deleted ? '[]' : file.content);
    const changed = [...new Set([...before.keys(), ...after.keys()])].filter((id) => fingerprint(before.get(id) ?? null) !== fingerprint(after.get(id) ?? null));
    for (const id of changed) {
      const type = !after.has(id) ? 'deleted' : !before.has(id) ? 'added' : 'modified';
      changes.push({ dataset: kind, id, type });
      for (const locale of ['zh', 'en', 'ja']) {
        const directory = `/${locale}/hi3/${routes[kind]}`;
        const path = `${directory}/${id}`;
        const existing = pages.get(directory) ?? { expectedLinks: [], removedLinks: [] };
        add(directory, 'directory', { expectedLinks: [...existing.expectedLinks, ...(type === 'deleted' ? [] : [path])],
          removedLinks: [...existing.removedLinks, ...(type === 'deleted' ? [path] : [])] });
        add(path, type === 'deleted' ? 'deleted' : 'detail', { entityId: id, changeType: type, directory });
      }
    }
  }
  if (pages.size > maxPages) throw new FactError(`受影响页面 ${pages.size} 个，超过 ${maxPages} 页预算；请拆分批次，不允许静默抽样`, 409);
  return { version: 'hi3-entity-diff-v1', pages: [...pages.values()], changes, notCovered, budget: maxPages };
}
