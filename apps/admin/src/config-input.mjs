import { constants, openSync, closeSync, lstatSync, realpathSync, fstatSync, readSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import ts from 'typescript';

export const configInputLimit = 1024 * 1024;

export function readConfigInput(root, path) {
  let fd;
  try {
    root = realpathSync(root);
    const absolute = resolve(root, path);
    if (!absolute.startsWith(root + sep) || realpathSync(absolute) !== absolute) return { status: 'unavailable', reason: 'unsafe_path' };
    const before = lstatSync(absolute);
    if (!before.isFile()) return { status: 'unavailable', reason: 'not_regular_file' };
    if (before.size > configInputLimit) return { status: 'unavailable', reason: 'byte_budget_exceeded' };
    fd = openSync(absolute, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const opened = fstatSync(fd);
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) return { status: 'unavailable', reason: 'changed_during_read' };
    const buffer = Buffer.alloc(configInputLimit + 1); let count = 0;
    while (count < buffer.length) {
      const size = readSync(fd, buffer, count, buffer.length - count, count);
      if (!size) break;
      count += size;
    }
    if (count > configInputLimit) return { status: 'unavailable', reason: 'byte_budget_exceeded' };
    const after = fstatSync(fd); const current = lstatSync(absolute);
    if (opened.size !== after.size || opened.mtimeMs !== after.mtimeMs || opened.ctimeMs !== after.ctimeMs ||
      current.dev !== opened.dev || current.ino !== opened.ino || realpathSync(absolute) !== absolute) return { status: 'unavailable', reason: 'changed_during_read' };
    const bytes = buffer.subarray(0, count);
    return { status: 'read', digest: createHash('sha256').update(bytes).digest('hex'), bytes: count, text: bytes.toString('utf8') };
  } catch { return { status: 'unavailable', reason: 'missing_unsafe_or_unreadable' }; }
  finally { if (fd !== undefined) closeSync(fd); }
}

export function parseConfigObject(text, { jsonc = false } = {}) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > configInputLimit) return { status: 'invalid', reason: 'invalid_or_oversized_text' };
  try {
    const tree = ts.parseJsonText('config.json', text);
    if (tree.parseDiagnostics.length) return { status: 'invalid', reason: 'invalid_json_syntax' };
    let duplicate = false; let exhausted = false; let nodes = 0;
    function visit(node, depth) {
      if (++nodes > 20000 || depth > 64) { exhausted = true; return; }
      if (ts.isObjectLiteralExpression(node)) {
        const keys = new Set();
        for (const property of node.properties) {
          const key = property.name?.text;
          if (typeof key !== 'string') { exhausted = true; return; }
          if (keys.has(key)) duplicate = true;
          keys.add(key);
        }
      }
      ts.forEachChild(node, (child) => { if (!exhausted) visit(child, depth + 1); });
    }
    visit(tree, 0);
    if (exhausted) return { status: 'invalid', reason: 'structure_budget_exceeded' };
    if (duplicate) return { status: 'invalid', reason: 'duplicate_json_key' };
    const parsed = jsonc ? ts.parseConfigFileTextToJson('config.jsonc', text) : { config: JSON.parse(text) };
    if (parsed.error || !parsed.config || typeof parsed.config !== 'object' || Array.isArray(parsed.config)) return { status: 'invalid', reason: 'invalid_config_object' };
    return { status: 'parsed', value: parsed.config };
  } catch { return { status: 'invalid', reason: 'invalid_json_syntax' }; }
}
