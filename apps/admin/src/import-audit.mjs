import { existsSync, lstatSync, realpathSync } from 'node:fs';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import ts from 'typescript';
import { readConfigInput } from './config-input.mjs';

export function auditImports(root, entries) {
  if (!Array.isArray(entries) || entries.length > 500 || entries.some((path) => typeof path !== 'string' || !path || path.length > 4096)) throw new Error('Invalid import audit entries');
  root = realpathSync(root);
  const queue = [...entries]; const queued = new Set(entries); const seen = new Set(); const files = []; const issues = []; const external = new Set();
  let queueTruncated = false;
  const candidates = (path) => extname(path) ? [path] : [path, ...['.ts', '.tsx', '.mjs', '.js', '.json'].map((ext) => path + ext), ...['index.ts', 'index.tsx', 'index.mjs', 'index.js'].map((name) => resolve(path, name))];
  while (queue.length && seen.size < 500) {
    const path = queue.shift(); if (seen.has(path)) continue; seen.add(path);
    const absolute = resolve(root, path);
    try {
      const input = readConfigInput(root, path);
      if (input.status !== 'read') throw new Error('unsafe_or_budget');
      files.push({ path, digest: input.digest });
      if (extname(path) === '.json') continue;
      const tree = ts.createSourceFile(path, input.text, ts.ScriptTarget.Latest, true);
      if (tree.parseDiagnostics.length) issues.push({ path, reason: 'syntax_diagnostics' });
      let nodes = 0;
      function visit(node, depth = 0) {
        if (++nodes > 50000 || depth > 128) { if (!issues.some((item) => item.path === path && item.reason === 'ast_budget')) issues.push({ path, reason: 'ast_budget' }); return; }
        let specifier;
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) specifier = node.moduleSpecifier;
        if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
          specifier = node.arguments[0];
          if (!specifier || !ts.isStringLiteral(specifier)) issues.push({ path, reason: 'dynamic_import_not_resolved' });
        }
        if (specifier && ts.isStringLiteral(specifier)) {
          const name = specifier.text;
          let target;
          if (name.startsWith('.')) target = resolve(dirname(absolute), name);
          else if (name.startsWith('@/') && path.startsWith('apps/web/')) target = resolve(root, 'apps/web', name.slice(2));
          else { external.add(name); }
          if (target) {
            if (!target.startsWith(root + sep)) { issues.push({ path, specifier: name, reason: 'local_import_outside_root' }); return; }
            const matched = candidates(target).find((item) => existsSync(item) && lstatSync(item).isFile());
            if (!matched) issues.push({ path, specifier: name, reason: 'local_import_missing' });
            else {
              const next = relative(root, matched);
              if (!queued.has(next)) {
                if (queued.size >= 500) queueTruncated = true;
                else { queued.add(next); queue.push(next); }
              }
            }
          }
        }
        if (nodes <= 50000) ts.forEachChild(node, (child) => { visit(child, depth + 1); });
      }
      visit(tree);
    } catch { issues.push({ path, reason: 'file_unavailable_unsafe_or_over_budget' }); }
  }
  if (queue.length || queueTruncated) issues.push({ reason: 'file_budget_exceeded' });
  return { version: 2, kind: 'static_local_import_observation_not_build_or_review', entries, files, issues,
    attemptedFiles: seen.size, use: 'offline_review_helper_not_server_endpoint',
    externalSpecifiers: [...external].sort(), result: issues.length ? 'needs_review' : 'listed_local_imports_resolved_only',
    limits: { files: 500, bytesPerFile: 1024 * 1024, astNodesPerFile: 50000, astDepth: 128, hardTimeLimit: false },
    notCovered: ['package/workspace export resolution and installed artifacts', 'complete Next/TypeScript resolution and configs', 'runtime computed paths and filesystem/network inputs', 'type semantics, secrets, code review and production build'],
    permissions: { execute: false, install: false, stage: false, commit: false, publish: false } };
}
