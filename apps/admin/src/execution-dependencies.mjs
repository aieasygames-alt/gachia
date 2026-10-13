import { parseDocument } from 'yaml';
import { posix } from 'node:path';

// Audit lock metadata only. Never consult the host installation or fetch artifacts.
export function inspectExecutionDependencies(manifest, contents) {
  const issues = []; let issueCount = 0; let blockingCount = 0;
  const add = (kind, path, detail) => {
    issueCount++; if (kind !== 'not_covered') blockingCount++;
    if (issues.length < 200) issues.push({ kind, path, detail: String(detail).slice(0, 400) });
  };
  const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  function yaml(path) {
    try {
      const text = contents.get(path);
      if (typeof text !== 'string') throw new Error('Missing YAML input');
      const doc = parseDocument(text, { uniqueKeys: true, customTags: [] });
      if (doc.errors.length || doc.warnings.length) throw new Error('Invalid YAML, duplicate keys or unsupported tags');
      const result = doc.toJS({ maxAliasCount: 50 });
      if (!object(result)) throw new Error('Expected YAML mapping');
      return result;
    } catch (error) { add('invalid_yaml', path, error.message); return {}; }
  }
  const workspace = yaml('pnpm-workspace.yaml'); const lock = yaml('pnpm-lock.yaml');
  const patterns = workspace.packages;
  if (!Array.isArray(patterns) || patterns.some((pattern) => !['apps/*', 'packages/*'].includes(pattern))) {
    add('unsupported_workspace_patterns', 'pnpm-workspace.yaml', 'Only explicit apps/* and packages/* patterns are supported');
  }
  if (String(lock.lockfileVersion) !== '9.0') add('unsupported_lock_version', 'pnpm-lock.yaml', 'Only pnpm lockfile 9.0 is supported');
  const importers = object(lock.importers) ? lock.importers : {};
  const snapshots = object(lock.snapshots) ? lock.snapshots : {};
  const artifacts = object(lock.packages) ? lock.packages : {};
  const packages = new Map();
  for (const file of manifest.files) {
    if (!/^(package\.json|apps\/[^/]+\/package\.json|packages\/[^/]+\/package\.json)$/.test(file.path)) continue;
    try {
      const value = JSON.parse(contents.get(file.path));
      if (!object(value)) throw new Error('Invalid manifest');
      packages.set(posix.dirname(file.path), value);
    } catch { add('invalid_manifest', file.path, 'Expected JSON package mapping'); }
  }
  if (!packages.has('apps/web')) add('missing_preview_package', 'apps/web/package.json', 'Preview package is missing');
  const omittedImporters = Object.keys(importers).filter((path) => !packages.has(path));
  if (omittedImporters.length) add('not_covered', 'pnpm-lock.yaml', 'Other lock importers are omitted; whole-workspace frozen install is not validated');
  const queue = []; const queued = new Set(); const visited = new Set(); let edges = 0;
  function dependency(path, name, version, transitive = false) {
    edges++;
    if (edges > 50000) { if (edges === 50001) add('graph_budget', path, 'Dependency graph exceeds 50000 edges'); return; }
    if (typeof version !== 'string') { add('invalid_lock_reference', path, name); return; }
    if (version.startsWith('link:')) {
      if (transitive) { add('unsupported_dependency_protocol', path, `${name}: ${version}`); return; }
      const target = posix.normalize(posix.join(path, version.slice(5)));
      if (posix.isAbsolute(version.slice(5)) || target.startsWith('../') || !packages.has(target)) add('missing_local_dependency', path, `${name}: ${version}`);
      return;
    }
    if (/^(file:|workspace:|https?:|git|npm:)/.test(version)) { add('unsupported_dependency_protocol', path, `${name}: ${version}`); return; }
    const key = `${name}@${version}`;
    if (!Object.hasOwn(snapshots, key)) { add('missing_snapshot', path, key); return; }
    if (!queued.has(key)) { queued.add(key); queue.push(key); }
  }
  const sections = ['dependencies', 'devDependencies', 'optionalDependencies'];
  for (const [path, pkg] of packages) {
    if (path !== '.' && (!Array.isArray(patterns) || !patterns.includes(`${path.split('/')[0]}/*`))) add('package_outside_workspace', path, 'Included package does not match supported workspace patterns');
    const importer = importers[path];
    if (!object(importer)) { add('missing_importer', path, 'Included package has no lock importer'); continue; }
    for (const section of sections) {
      const declarations = pkg[section] ?? {}; const locked = importer[section] ?? {};
      if (!object(declarations) || !object(locked)) { add('invalid_dependency_section', path, section); continue; }
      for (const name of new Set([...Object.keys(declarations), ...Object.keys(locked)])) {
        const entry = locked[name];
        if (!object(entry) || entry.specifier !== declarations[name] || typeof declarations[name] !== 'string') add('specifier_mismatch', path, `${section}: ${name}`);
        if (object(entry) && typeof declarations[name] === 'string' && declarations[name].startsWith('workspace:')) {
          const target = typeof entry.version === 'string' && entry.version.startsWith('link:')
            ? posix.normalize(posix.join(path, entry.version.slice(5))) : null;
          if (!target || packages.get(target)?.name !== name) add('workspace_target_mismatch', path, name);
        }
        if (object(entry)) dependency(path, name, entry.version);
      }
    }
  }
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const key = queue[cursor]; if (visited.has(key)) continue; visited.add(key);
    if (visited.size > 10000 || edges > 50000) { add('graph_budget', 'pnpm-lock.yaml', 'Dependency graph exceeds 10000 nodes or 50000 edges'); break; }
    const snapshot = snapshots[key];
    if (!object(snapshot)) { add('invalid_snapshot', 'pnpm-lock.yaml', key); continue; }
    const artifactKey = key.split('(')[0]; const artifact = artifacts[artifactKey];
    if (!object(artifact) || !/^sha512-[A-Za-z0-9+/]+={0,2}$/.test(artifact.resolution?.integrity ?? '')) add('unverified_artifact_identity', 'pnpm-lock.yaml', artifactKey);
    for (const section of ['dependencies', 'optionalDependencies']) {
      if (snapshot[section] !== undefined && !object(snapshot[section])) { add('invalid_dependency_section', key, section); continue; }
      for (const [name, version] of Object.entries(snapshot[section] ?? {})) dependency('.', name, version, true);
    }
  }
  return { version: 'execution-dependencies-v1', materialDigest: manifest.digest, status: blockingCount ? 'needs_attention' : 'partial_pass',
    includedImporters: [...packages.keys()].sort(), omittedImporters, graphNodes: visited.size, graphEdges: edges,
    issueCount, issues, issuesTruncated: issueCount > issues.length, executable: false,
    notCovered: ['Peer satisfaction, overrides/catalog semantics, patches, hooks and pnpm install settings', 'Optional dependency platform filtering and Linux native binaries', 'Artifact bytes, registry trust, integrity verification and installed dependency layout', 'Other omitted workspace packages and whole-workspace frozen installation', 'No dependencies are installed; lock metadata closure is not execution authorization'] };
}
