import { readdirSync, lstatSync, realpathSync, openSync, closeSync, fstatSync, readSync, constants } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fingerprint } from './revisions.mjs';

const directories = ['packages/data/games/hi3', 'apps/web/public/data/hi3'];
const policies = {
  characters: ['name', 'description'], weapons: ['name', 'description'], materials: ['name', 'source'],
  guides: ['title', 'summary', 'content'], 'astral-ops': ['name', 'description'], 'stigma-sets': ['name', 'description'],
};
const references = { characterId: 'characters', characterIds: 'characters', weaponId: 'weapons', weaponIds: 'weapons',
  materialId: 'materials', materialIds: 'materials', guideId: 'guides', guideIds: 'guides',
  astralOpId: 'astral-ops', stigmaSetId: 'stigma-sets' };
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function readDraftFile(root, path, maxBytes = 4 * 1024 * 1024) {
  if (!Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > 4 * 1024 * 1024 ||
    typeof path !== 'string' || !/^(packages\/data\/games\/hi3|apps\/web\/public\/data\/hi3)\/raw-[a-z0-9-]+\.json$/.test(path)) {
    throw new Error('Invalid draft read budget or path');
  }
  let fd;
  try {
    const absolute = resolve(root, path);
    if (realpathSync(root) !== root || !absolute.startsWith(root + sep) || realpathSync(absolute) !== absolute) throw new Error('Unsafe draft path');
    const before = lstatSync(absolute);
    if (!before.isFile() || before.size > maxBytes) throw new Error('Invalid or oversized draft file');
    fd = openSync(absolute, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const opened = fstatSync(fd);
    const stamp = (stat) => [stat.dev, stat.ino, stat.size, stat.mode, stat.mtimeMs, stat.ctimeMs].join(':');
    if (!opened.isFile() || stamp(before) !== stamp(opened)) throw new Error('Draft changed before read');
    // Read at most the budget plus one byte, even if the file grows after stat.
    const buffer = Buffer.alloc(maxBytes + 1); let count = 0;
    while (count < buffer.length) {
      const length = readSync(fd, buffer, count, buffer.length - count, count);
      if (!length) break;
      count += length;
    }
    if (count > maxBytes || count !== opened.size || stamp(opened) !== stamp(fstatSync(fd)) ||
      stamp(opened) !== stamp(lstatSync(absolute)) || realpathSync(absolute) !== absolute) throw new Error('Draft changed or exceeded budget');
    return buffer.subarray(0, count);
  } finally { if (fd !== undefined) closeSync(fd); }
}

export function captureDraft(root, inspection) {
  const files = []; const errors = [];
  for (const directory of directories) {
    const absolute = join(root, directory);
    try {
      if (realpathSync(absolute) !== absolute) throw new Error('Unsafe directory');
      for (const name of readdirSync(absolute).filter((item) => /^raw-[a-z0-9-]+\.json$/.test(item)).sort()) {
        const path = `${directory}/${name}`;
        const stat = lstatSync(join(root, path));
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4 * 1024 * 1024) {
          files.push({ path, error: '非普通文件、符号链接或超过 4 MiB' }); continue;
        }
        try {
          const bytes = readDraftFile(root, path);
          files.push({ path, digest: sha(bytes), bytes: bytes.length });
        } catch { files.push({ path, error: '读取期间变化、路径不安全或超过 4 MiB' }); }
      }
    } catch { errors.push(`无法安全读取目录: ${directory}`); }
  }
  const manifest = { files, errors, changes: inspection.changes, diffDigest: inspection.diffDigest,
    scopeStatus: inspection.status, scopeReasons: inspection.reasons };
  return { ...manifest, fingerprint: fingerprint(manifest) };
}

export function validateDraft(workspace, capture) {
  const checks = []; const parsed = new Map();
  const add = (ruleId, status, path, message) => checks.push({ ruleId, status, path, message });
  add('workspace.scope', workspace.inspection.status === 'blocked' ? 'failed' : 'passed', '',
    workspace.inspection.reasons.join('；') || '事实、基线与文件范围检查通过');
  for (const error of capture.errors) add('files.read', 'failed', '', error);
  for (const file of capture.files) {
    if (file.error) { add('files.read', 'failed', file.path, file.error); continue; }
    try {
      const bytes = readDraftFile(workspace.path, file.path);
      if (sha(bytes) !== file.digest) throw new Error('Changed during read');
      const rows = JSON.parse(bytes);
      if (!Array.isArray(rows)) throw new Error('Expected array');
      parsed.set(file.path, rows);
      add('json.array', 'passed', file.path, `已解析 ${rows.length} 条记录`);
    } catch { add('json.array', 'failed', file.path, '读取期间变化、JSON 无效或顶层不是数组'); }
  }
  const kinds = new Set([...Object.keys(policies), ...capture.files.map((file) => file.path.split('/').at(-1).slice(4, -5))]);
  const idsByKind = new Map();
  for (const kind of kinds) {
    const path = `${directories[0]}/raw-${kind}.json`; const mirror = `${directories[1]}/raw-${kind}.json`;
    const rows = parsed.get(path); const mirrored = parsed.get(mirror);
    add('mirror.content', rows && mirrored && fingerprint(rows) === fingerprint(mirrored) ? 'passed' : 'failed', path, '源文件与公共镜像均存在且内容一致');
    if (!rows) continue;
    const ids = new Set(); idsByKind.set(kind, ids);
    let idsValid = true; let localesValid = true;
    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row) || typeof row.id !== 'string' || !/^[a-z0-9-]+$/.test(row.id) || ids.has(row.id)) {
        idsValid = false; add('entity.id', 'failed', path, '记录非对象、ID 无效或重复'); continue;
      }
      ids.add(row.id);
      for (const field of policies[kind] ?? []) {
        for (const suffix of ['', 'En', 'Ja']) {
          if (typeof row[`${field}${suffix}`] !== 'string' || !row[`${field}${suffix}`].trim()) {
            localesValid = false; add('locale.required', 'failed', path, `${row.id}: 缺少 ${field}${suffix}`);
          }
        }
      }
      if (kind === 'guides' && row.faq !== undefined) {
        if (!Array.isArray(row.faq)) { localesValid = false; add('locale.faq', 'failed', path, `${row.id}: FAQ 不是数组`); }
        else for (const faq of row.faq) for (const field of ['question', 'answer']) for (const suffix of ['', 'Zh', 'Ja']) {
          if (typeof faq?.[`${field}${suffix}`] !== 'string' || !faq[`${field}${suffix}`].trim()) {
            localesValid = false; add('locale.faq', 'failed', path, `${row.id}: FAQ 缺少 ${field}${suffix}`);
          }
        }
      }
    }
    if (idsValid) add('entity.id', 'passed', path, 'ID 格式有效且无重复');
    if (policies[kind] && localesValid) add('locale.required', 'passed', path, '必需三语文本字段非空（不代表翻译正确）');
    if (!policies[kind]) add('schema.kind', 'not_covered', path, '未知数据种类，仅检查数组、ID 与镜像');
  }
  let referenceCount = 0;
  function walk(value, path) {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (references[key]) {
        referenceCount++;
        const values = key.endsWith('Ids') ? child : [child];
        if (!Array.isArray(values) || values.some((id) => typeof id !== 'string' || !idsByKind.get(references[key])?.has(id))) {
          add('entity.reference', 'failed', path, `${key}: 类型错误或引用不存在`);
        }
      } else if (/Ids?$/.test(key) && key !== 'id') add('entity.reference.unknown', 'not_covered', path, `未配置引用字段: ${key}`);
      if (child && typeof child === 'object') walk(child, path);
    }
  }
  for (const [path, rows] of parsed) if (path.startsWith(directories[0])) walk(rows, path);
  if (!checks.some((check) => check.ruleId === 'entity.reference' && check.status === 'failed')) {
    add('entity.reference', referenceCount ? 'passed' : 'not_covered', '', referenceCount ? `检查 ${referenceCount} 个已知引用字段` : '没有显式引用字段；正文提及和链接未验证');
  }
  for (const ruleId of ['facts.semantic', 'translation.accuracy', 'directory.reachability', 'search.coverage', 'sitemap.coverage', 'build', 'browser.behavior', 'worker.bundle']) {
    add(ruleId, 'not_covered', '', '未执行，不可作为通过或发布依据');
  }
  const failed = checks.filter((check) => check.status === 'failed').length;
  return { id: randomUUID(), workspaceId: workspace.id, revisionId: workspace.revisionId,
    rulesVersion: 'hi3-draft-v1', createdAt: new Date().toISOString(), inputFingerprint: capture.fingerprint,
    files: capture.files, diffDigest: capture.diffDigest, checks,
    summary: { status: failed ? 'failed' : 'partial_pass', failed,
      passed: checks.filter((check) => check.status === 'passed').length,
      notCovered: checks.filter((check) => check.status === 'not_covered').length },
    capabilities: { edit: false, commit: false, publish: false } };
}
