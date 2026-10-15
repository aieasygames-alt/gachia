import ts from 'typescript';
import { posix } from 'node:path';

// This host exposes manifest bytes only; it never reads dependencies or runs config.
export function inspectExecutionInputs(manifest, contents) {
  const files = new Set(manifest.files.map((file) => file.path));
  const directories = new Set();
  for (const file of files) {
    let dir = posix.dirname(file);
    while (dir !== '.') { directories.add(dir); dir = posix.dirname(dir); }
  }
  const issues = []; const external = new Set(); const packages = new Map();
  let references = 0; let issueCount = 0; let blockingCount = 0;
  const add = (kind, file, detail) => { issueCount++; if (kind !== 'not_covered') blockingCount++; if (issues.length < 200) issues.push({ kind, file, detail: String(detail).slice(0, 500) }); };
  for (const item of manifest.sourceExclusions ?? []) add('not_covered', item.path, `Explicitly excluded source input: ${item.reason}`);
  const normalize = (path) => posix.normalize(path.replace(/^\//, ''));
  const host = {
    fileExists: (path) => files.has(normalize(path)),
    readFile: (path) => contents.get(normalize(path)),
    directoryExists: (path) => normalize(path) === '.' || directories.has(normalize(path).replace(/\/$/, '')),
    getCurrentDirectory: () => '/',
    realpath: (path) => path,
  };
  function local(file, value) {
    const path = posix.normalize(posix.join(posix.dirname(file), value));
    if (path === '..' || path.startsWith('../') || posix.isAbsolute(value)) {
      add('outside_material', file, value); return null;
    }
    if (!files.has(path) && !directories.has(path)) add('missing_local_input', file, value);
    return path;
  }
  for (const file of files) {
    if (!/(^|\/)package\.json$/.test(file)) continue;
    let data;
    try {
      data = JSON.parse(contents.get(file));
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Expected mapping');
    } catch { add('invalid_package_json', file, 'Cannot parse package mapping'); continue; }
    if (data.name) {
      if (packages.has(data.name)) add('duplicate_workspace_package', file, data.name);
      packages.set(data.name, file);
    }
    for (const section of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      if (data[section] !== undefined && (!data[section] || typeof data[section] !== 'object' || Array.isArray(data[section]))) {
        add('invalid_dependency_section', file, section); continue;
      }
      for (const [name, version] of Object.entries(data[section] ?? {})) {
        if (typeof version !== 'string') { add('invalid_dependency', file, name); continue; }
        if (/^(file:|link:)/.test(version)) local(file, version.replace(/^(file:|link:)/, ''));
        else if (version.startsWith('workspace:')) {
          // Resolve after the complete package inventory has been collected.
          external.add(JSON.stringify({ file, name, version }));
        }
      }
    }
    for (const field of ['main', 'module', 'types', 'typings']) if (typeof data[field] === 'string') local(file, data[field]);
    if (data.scripts && Object.keys(data.scripts).length) add('not_covered', file, 'Package scripts are inventoried, not parsed or authorized; lifecycle scripts must be disabled in dependency preparation');
    if (data.exports || data.imports) add('not_covered', file, 'Conditional package exports/imports require runtime-specific validation');
  }
  for (const value of external) {
    const { file, name, version } = JSON.parse(value); const target = version.slice(10);
    if (target.startsWith('.')) local(file, target);
    else if (!packages.has(name)) add('missing_workspace_package', file, `${name}: ${version}`);
  }
  external.clear();
  const configs = new Map();
  for (const file of files) {
    if (!/(^|\/)(tsconfig[^/]*|jsconfig)\.json$/.test(file)) continue;
    const parsed = ts.readConfigFile(`/${file}`, host.readFile);
    if (parsed.error) { add('invalid_config', file, ts.flattenDiagnosticMessageText(parsed.error.messageText, ' ')); continue; }
    const config = ts.parseJsonConfigFileContent(parsed.config, { ...host, readDirectory: () => [] }, `/${posix.dirname(file)}`, undefined, `/${file}`);
    // No-input diagnostics are expected because this check does not enumerate compiler inputs.
    for (const error of config.errors.filter((error) => error.code !== 18003)) add('config_resolution', file, ts.flattenDiagnosticMessageText(error.messageText, ' '));
    configs.set(posix.dirname(file), config.options);
  }
  function reference(file, value) {
    references++;
    const directory = posix.dirname(file);
    const config = [...configs].filter(([dir]) => directory === dir || directory.startsWith(`${dir}/`) || dir === '.')
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? { moduleResolution: ts.ModuleResolutionKind.Bundler, resolveJsonModule: true, allowJs: true };
    const found = ts.resolveModuleName(value, `/${file}`, config, host).resolvedModule;
    if (found) return;
    if (value.startsWith('.') || value.startsWith('/')) {
      const path = posix.normalize(posix.join(directory, value));
      add(value.startsWith('/') || path.startsWith('../') ? 'outside_material' : 'unresolved_local_import', file, value);
    } else if ([...packages.keys()].some((name) => value === name || value.startsWith(`${name}/`)) || Object.keys(config.paths ?? {}).some((key) => value.startsWith(key.split('*')[0]))) {
      add('unresolved_workspace_or_alias', file, value);
    } else external.add(value);
  }
  for (const file of files) {
    if (!/\.[cm]?[jt]sx?$/.test(file)) continue;
    const source = ts.createSourceFile(file, contents.get(file) ?? '', ts.ScriptTarget.Latest, true);
    for (const error of source.parseDiagnostics) add('syntax_error', file, ts.flattenDiagnosticMessageText(error.messageText, ' '));
    let nodes = 0; let exhausted = false;
    function visit(node, depth = 0) {
      if (exhausted) return;
      if (++nodes > 50000 || depth > 128) {
        exhausted = true; add('syntax_budget', file, 'AST traversal exceeds 50000 nodes or depth 128'); return;
      }
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) reference(file, node.moduleSpecifier.text);
      if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && node.moduleReference.expression && ts.isStringLiteral(node.moduleReference.expression)) reference(file, node.moduleReference.expression.text);
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
        if (node.arguments.length === 1 && ts.isStringLiteralLike(node.arguments[0])) reference(file, node.arguments[0].text);
        else add('not_covered', file, 'Computed import/require cannot be resolved statically');
      }
      ts.forEachChild(node, (child) => { visit(child, depth + 1); });
    }
    visit(source);
  }
  return { version: 'execution-input-scope-v1', parserVersion: ts.version, materialDigest: manifest.digest,
    status: blockingCount ? 'needs_attention' : 'partial_pass', references, issueCount, issues, issuesTruncated: issueCount > issues.length,
    externalModules: [...external].sort(), executable: false,
    notCovered: ['Filesystem reads, URLs, new URL assets, CSS imports and framework/plugin loaders', 'Computed loaders, require aliases and config execution', 'Workspace YAML globs, lockfile dependency closure and installed external dependencies', 'Linux image/platform/native dependency verification', 'AST budgets apply after parsing, not hard CPU/memory limits', 'Static inspection is not complete input closure or execution authorization'] };
}
