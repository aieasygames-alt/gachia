import { execFileSync } from 'node:child_process';
import { lstatSync, realpathSync, openSync, closeSync, fstatSync, readSync, constants } from 'node:fs';
import { resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';

function category(path) {
  if (/^(packages\/data\/games\/|apps\/web\/public\/data\/)/.test(path) && path.endsWith('.json')) return 'content_data';
  if (/^reports\//.test(path)) return 'historical_report_not_acceptance';
  if (/^(docs\/|plans\/)/.test(path) || path.endsWith('README.md')) return 'documentation';
  if (/(^|\/)(tests|__tests__)\//.test(path) || /\.test\.[^/]+$/.test(path)) return 'test';
  if (/(^|\/)(package\.json|pnpm-lock\.yaml|wrangler\.jsonc|\.gitignore)$/.test(path)) return 'configuration';
  return 'code_or_other_requires_review';
}

export function baselineInventory(root, { maxFiles = 2000, maxBytes = 4 * 1024 * 1024 } = {}) {
  if (!Number.isInteger(maxFiles) || maxFiles < 1 || maxFiles > 2000 || !Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > 4 * 1024 * 1024) throw new Error('Invalid inventory budget');
  root = realpathSync(root);
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } });
  if (realpathSync(git('rev-parse', '--show-toplevel').replace(/\n$/, '')) !== root) throw new Error('Inventory requires repository root');
  const headBefore = git('rev-parse', 'HEAD').replace(/\n$/, '');
  const raw = git('status', '--porcelain=v1', '-z', '--untracked-files=all');
  const records = raw.split('\0'); const entries = [];
  for (let i = 0; i < records.length; i++) {
    const record = records[i]; if (!record) continue;
    const status = record.slice(0, 2); const path = record.slice(3);
    const originalPath = /[RC]/.test(status) ? records[++i] : undefined;
    entries.push({ path, status, ...(originalPath === undefined ? {} : { originalPath }) });
  }
  const files = entries.slice(0, maxFiles).map((entry) => {
    const item = { ...entry, category: category(entry.path), reviewStatus: 'not_reviewed', contentApproval: false,
      indexStatus: entry.status[0], worktreeStatus: entry.status[1] };
    let fd;
    try {
      const absolute = resolve(root, entry.path);
      if (!absolute.startsWith(root + sep)) throw new Error('Unsafe path');
      const stat = lstatSync(absolute);
      if (realpathSync(absolute) !== absolute) throw new Error('Unsafe path');
      if (!stat.isFile()) return { ...item, observation: 'not_regular_file' };
      if (stat.size > maxBytes) return { ...item, observation: 'byte_budget_exceeded', bytes: stat.size };
      fd = openSync(absolute, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
      const opened = fstatSync(fd);
      if (!opened.isFile() || opened.dev !== stat.dev || opened.ino !== stat.ino) return { ...item, observation: 'changed_during_read' };
      const buffer = Buffer.alloc(maxBytes + 1); let count = 0;
      while (count < buffer.length) {
        const read = readSync(fd, buffer, count, buffer.length - count, count);
        if (!read) break;
        count += read;
      }
      if (count > maxBytes) return { ...item, observation: 'byte_budget_exceeded' };
      const after = fstatSync(fd); const pathAfter = lstatSync(absolute);
      if (after.size !== opened.size || after.mtimeMs !== opened.mtimeMs || after.ctimeMs !== opened.ctimeMs ||
        pathAfter.dev !== opened.dev || pathAfter.ino !== opened.ino || realpathSync(absolute) !== absolute) return { ...item, observation: 'changed_during_read' };
      const bytes = buffer.subarray(0, count);
      return { ...item, observation: 'hashed_worktree_bytes_only', bytes: bytes.length,
        digest: createHash('sha256').update(bytes).digest('hex') };
    } catch (error) {
      return { ...item, observation: error.code === 'ENOENT' && entry.status.includes('D') ? 'deleted_no_worktree_bytes' : 'missing_or_unsafe_or_unreadable' };
    } finally { if (fd !== undefined) closeSync(fd); }
  });
  const headAfter = git('rev-parse', 'HEAD').replace(/\n$/, '');
  const statusAfter = git('status', '--porcelain=v1', '-z', '--untracked-files=all');
  return { version: 2, kind: 'dirty_worktree_inventory_not_code_review', headBefore, headAfter,
    consistency: headBefore === headAfter && raw === statusAfter ? 'two_git_observations_match_not_atomic' : 'changed_during_observation',
    observedAt: new Date().toISOString(), observedChanges: entries.length, listedChanges: files.length,
    truncated: entries.length > maxFiles, files,
    byteCoverage: { hashed: files.filter((item) => item.observation === 'hashed_worktree_bytes_only').length,
      deleted: files.filter((item) => item.observation === 'deleted_no_worktree_bytes').length,
      notHashed: files.filter((item) => !['hashed_worktree_bytes_only', 'deleted_no_worktree_bytes'].includes(item.observation)).length,
      omitted: entries.length - files.length },
    groups: Object.fromEntries([...new Set(files.map((item) => item.category))].map((key) => [key, files.filter((item) => item.category === key).length])),
    limits: { maxFiles, maxBytesPerFile: maxBytes, gitOutputBytes: 4 * 1024 * 1024, hardTimeLimit: false },
    warning: '清单不是代码审核、秘密扫描或提交批准；工作树摘要不是暂存区摘要，两次Git观察不能保证文件读取原子性。',
    notCovered: ['未变化文件及完整导入闭包', 'ignored文件/运行库/依赖', '内容与代码语义/完整秘密扫描', '暂存区逐文件字节', '历史报告输入时效/真实草案/线上状态'],
    permissions: { stage: false, commit: false, copyToDraft: false, install: false, execute: false, publish: false } };
}
