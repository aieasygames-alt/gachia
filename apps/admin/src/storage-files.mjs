import { lstat, opendir } from 'node:fs/promises';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

const categoryFor = (name) => name === 'workbench.sqlite' ? 'database' :
  ['workbench.sqlite-wal', 'workbench.sqlite-shm'].includes(name) ? 'sqlite_sidecars' :
    /^workbench\.sqlite\.v\d+-[a-f0-9-]+\.bak$/.test(name) ? 'migration_backups' :
      name === 'workspaces' ? 'workspaces' : name === 'execution-materials' ? 'execution_materials' : 'other';

export async function storageFiles(root, { maxEntries = 5000, maxDepth = 16, maxMs = 500 } = {}) {
  if (!Number.isInteger(maxEntries) || maxEntries < 1 || maxEntries > 5000 ||
    !Number.isInteger(maxDepth) || maxDepth < 0 || maxDepth > 16 ||
    !Number.isFinite(maxMs) || maxMs < 0 || maxMs > 500) throw new Error('Invalid storage metadata scan budget');
  const started = performance.now(); let entries = 0; let truncated = false;
  const categories = Object.fromEntries(['database', 'sqlite_sidecars', 'migration_backups', 'workspaces', 'execution_materials', 'other']
    .map((name) => [name, { files: 0, directories: 0, apparentBytes: 0 }]));
  const skipped = { symlinks: 0, hardlinks: 0, specialFiles: 0, errors: 0, depth: 0 };
  const budget = () => { if (entries >= maxEntries || performance.now() - started >= maxMs) truncated = true; return !truncated; };
  async function walk(path, category, depth, expected) {
    if (!budget()) return;
    let dir;
    try {
      const current = await lstat(path);
      if (!current.isDirectory() || current.isSymbolicLink() || current.dev !== expected.dev || current.ino !== expected.ino) { skipped.errors++; return; }
      dir = await opendir(path);
      for await (const item of dir) {
        if (!budget()) break;
        entries++;
        const childCategory = category ?? categoryFor(item.name); const child = join(path, item.name);
        try {
          const stat = await lstat(child);
          if (stat.isSymbolicLink()) { skipped.symlinks++; continue; }
          if (stat.dev !== expected.dev) { skipped.specialFiles++; continue; }
          if (stat.isDirectory()) {
            categories[childCategory].directories++;
            if (depth >= maxDepth) skipped.depth++;
            else await walk(child, childCategory, depth + 1, stat);
          } else if (stat.isFile()) {
            if (stat.nlink !== 1) { skipped.hardlinks++; continue; }
            categories[childCategory].files++; categories[childCategory].apparentBytes += stat.size;
          } else skipped.specialFiles++;
        } catch { skipped.errors++; }
      }
    } catch { skipped.errors++; }
  }
  try {
    const stat = await lstat(root);
    if (!stat.isDirectory() || stat.isSymbolicLink()) skipped.errors++;
    else await walk(root, null, 0, stat);
  } catch { skipped.errors++; }
  return { version: 1, scope: 'workbench_directory_metadata_only', observedAt: new Date().toISOString(),
    result: truncated || Object.values(skipped).some(Boolean) ? 'partial' : 'complete_metadata_scan', categories,
    totalApparentBytes: Object.values(categories).reduce((sum, value) => sum + value.apparentBytes, 0), entries, truncated, skipped,
    limits: { maxEntries, maxDepth, maxMs },
    notCovered: ['实际分配磁盘块、磁盘余量及增长趋势', '根目录以外的Git公共目录与外部依赖', '并发文件改写/祖先替换与扫描后变化', '硬链接、符号链接、跨设备挂载及特殊文件占用', '日志/缓存按语义分类与完整灾备'],
    permissions: { readBodies: false, delete: false, vacuum: false, restore: false } };
}
