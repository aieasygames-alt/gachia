// Read-only check of the actual installed R147 contract, not a workspace substitute.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { migrationPinned } from '../../scripts/genshin-migration-http.mjs';
import { digest } from '../../scripts/desktop-release-assets.mjs';
const root = import.meta.dirname;
const settings = JSON.parse(readFileSync(path.join(homedir(), 'Library/Application Support/GachiaCMS/settings.json')));
const installed = JSON.parse(readFileSync(path.join(root, '../cms-source-reader-2026-11-22-r147/application-installed.json')));
assert.equal(settings.app, installed.app);
assert.equal(digest(readFileSync(installed.application.path)), installed.application.pin);
const manifest = migrationPinned(installed.application);
const release = path.resolve(settings.app, '../..');
const helperPath = path.join(release, 'scripts/public-runtime-history.mjs');
const helperSHA256 = digest(readFileSync(helperPath));
assert.equal(helperSHA256, manifest.releaseFiles['scripts/public-runtime-history.mjs']);
const helper = await import(pathToFileURL(helperPath).href);
const sourceProof = JSON.parse(readFileSync(path.join(root, 'source-result.json')));
const current = migrationPinned(sourceProof), completed = migrationPinned(current.completion), old = migrationPinned(current.previousSourceIndex);
let rejection;
try { helper.assertPublicRuntimeTransition(current, { ...old, value: old }, completed); }
catch (error) { rejection = { name: error.name, message: error.message }; }
assert(rejection && rejection.name === 'AssertionError');
assert(rejection.message.includes('public-next-15.5.29-preserved-content-v1'));
assert(rejection.message.includes('public-main-better-auth-1.7.7-toolchain-security-v1'));
const result = { at: new Date().toISOString(), installedApp: settings.app, installedApplication: installed.application,
  installedHelper: { path: helperPath, pin: helperSHA256 }, sourceIndex: sourceProof,
  check: 'actual installed assertPublicRuntimeTransition, using pinned R148 completion and R146 parent',
  fullInstalledHistoryReaderRun: false, installedPolicySupported: false, rejection,
  currentPublicSource: 'R148; workspace reader passed', installedCMS: 'R147 preserved',
  next: 'Install the CI-verified R148 policy reader before using the resident CMS release CLI with R148',
  cmsContentWrites: 0, schemaMigrations: 0, workerWrites: 0 };
writeFileSync(path.join(root, 'installed-reader-boundary.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ installedCMS: 'R147', installedPolicySupported: false, next: result.next }));
