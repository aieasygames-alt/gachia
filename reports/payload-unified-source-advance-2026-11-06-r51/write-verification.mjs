import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { digest } from '../../scripts/desktop-release-assets.mjs';

const root = fileURLToPath(new URL('./', import.meta.url));
const text = file => readFileSync(join(root, file), 'utf8');
const cms = text('cms.log'), release = text('release.log'), documentation = text('documentation-final.log');
const counts = log => [...log.matchAll(/^[\u2139#] tests (\d+)$/gm)].map(match => Number(match[1]));
assert.deepEqual(counts(cms), [345]); assert.deepEqual(counts(release), [187, 988, 304]); assert.deepEqual(counts(documentation), [38]);
for (const log of [cms, release, documentation]) assert(!/^[\u2139#] fail [1-9]/m.test(log));
assert.deepEqual([...release.matchAll(/^Ran (\d+) tests? in /gm)].map(match => Number(match[1])), [7, 4, 14, 3, 9, 11, 8]);
assert(!/^(?:FAILED|ERROR)/m.test(release));
const publicResult = JSON.parse(text('public-final/result.json'));
assert.equal(publicResult.status, 'public_A_unchanged_editorial_not_activated'); assert.equal(publicResult.observations.length, 5);
const result = { schemaVersion: 1, kind: 'unified_source_advance_local_verification', observedAt: new Date().toISOString(),
  cms: { tests: 345, passed: 345 }, release: { tests: 1479, passed: 1479, groups: [187, 988, 304] },
  python: { tests: 56, passed: 56 }, documentation: { tests: 38, passed: 38 },
  logs: Object.fromEntries(['cms.log', 'release.log', 'documentation-final.log', 'public-final/result.json'].map(file => [file, digest(readFileSync(join(root, file)))])),
  public: { status: publicResult.status, responses: 5, genshinGuides: 32, nteGuides: 53, accountsEnabled: false },
  cloudWrites: false, productionPromoted: false, sourceAdvanced: false, newExecutorInstalledInCMS: false, allGameContentProductionQualified: false };
writeFileSync(join(root, 'verification.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify(result));
