import assert from 'node:assert/strict';
import { readFile, writeFile, realpath } from 'node:fs/promises';
import { resolve, basename, sep } from 'node:path';
import { sha256 } from './shadow-consistency-audit.mjs';

const directory = await realpath(resolve(process.argv[2] ?? ''));
if (!process.argv[2]) throw new Error('Usage: node scripts/shadow-evidence-verify.mjs <evidence-directory>');
const resultBytes = await readFile(resolve(directory, 'result.json'));
const result = JSON.parse(resultBytes);
assert.equal(result.passed, true);
assert.ok(result.records.length > 0);
const seen = new Set();
const files = [];
for (const row of result.records) {
  assert.equal(basename(row.bodyFile), row.bodyFile);
  assert.ok(!seen.has(row.bodyFile)); seen.add(row.bodyFile);
  const bodyPath = await realpath(resolve(directory, row.bodyFile));
  assert.ok(bodyPath.startsWith(directory + sep));
  const bytes = await readFile(bodyPath);
  assert.equal(bytes.length, row.bytes); assert.equal(sha256(bytes), row.sha256);
  const metadataPath = await realpath(resolve(directory, row.bodyFile.replace(/\.body$/, '.json')));
  assert.ok(metadataPath.startsWith(directory + sep));
  assert.deepEqual(JSON.parse(await readFile(metadataPath, 'utf8')), row);
  files.push({ file: row.bodyFile, bytes: bytes.length, sha256: row.sha256 });
}
const integrity = { passed: true, count: files.length, resultSHA256: sha256(resultBytes), files };
await writeFile(resolve(directory, 'evidence-integrity.json'), JSON.stringify(integrity, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ passed: true, count: files.length, resultSHA256: integrity.resultSHA256 }));
