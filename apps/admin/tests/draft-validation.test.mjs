import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { realpathSync } from 'node:fs';
import { captureDraft, validateDraft, readDraftFile } from '../src/draft-validation.mjs';

function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'gachia-validation-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const directories = ['packages/data/games/hi3', 'apps/web/public/data/hi3'];
  function put(kind, rows, mirror = true) {
    for (const directory of mirror ? directories : [directories[0]]) {
      mkdirSync(join(root, directory), { recursive: true });
      writeFileSync(join(root, directory, `raw-${kind}.json`), JSON.stringify(rows));
    }
  }
  for (const kind of ['characters', 'weapons', 'materials', 'guides', 'astral-ops', 'stigma-sets']) {
    const row = { id: 'example' };
    const fields = kind === 'guides' ? ['title', 'summary', 'content'] : kind === 'materials' ? ['name', 'source'] : ['name', 'description'];
    for (const field of fields) for (const suffix of ['', 'En', 'Ja']) row[`${field}${suffix}`] = 'text';
    put(kind, [row]);
  }
  const workspace = { id: 'workspace', revisionId: 'revision', path: root,
    inspection: { status: 'ready_for_manual_draft', reasons: [], changes: [], diffDigest: 'diff' } };
  const capture = () => captureDraft(root, workspace.inspection);
  const validate = () => validateDraft(workspace, capture());
  return { root, put, workspace, capture, validate };
}

test('valid three-language dataset passes only covered rules; unknown semantic checks stay uncovered', (t) => {
  const { validate } = fixture(t);
  const report = validate();
  assert.equal(report.summary.failed, 0);
  assert.equal(report.summary.status, 'partial_pass');
  assert.ok(report.checks.some((check) => check.ruleId === 'facts.semantic' && check.status === 'not_covered'));
  assert.equal(report.capabilities.publish, false);
  assert.equal(report.files.length, 12);
});

test('mirror drift, missing body, duplicate IDs, invalid FAQ and broken references fail', (t) => {
  const { put, validate } = fixture(t);
  put('weapons', [{ id: 'duplicate', name: 'A' }, { id: 'duplicate', name: 'B' }]);
  put('guides', [{ id: 'guide', title: 'guide', weaponId: 'missing', faq: [{ question: 'Q' }] }], false);
  const report = validate();
  for (const ruleId of ['mirror.content', 'locale.required', 'entity.id', 'locale.faq', 'entity.reference']) {
    assert.ok(report.checks.some((check) => check.ruleId === ruleId && check.status === 'failed'), ruleId);
  }
});

test('new untracked and extra data bytes change fingerprint; unknown schema remains uncovered', (t) => {
  const { put, capture, validate, workspace } = fixture(t);
  put('extras', [{ id: 'extra', futureId: 'unknown' }]);
  workspace.inspection.changes = [{ path: 'packages/data/games/hi3/raw-extras.json', allowed: true, untracked: true }];
  const before = capture().fingerprint;
  put('extras', [{ id: 'extra', futureId: 'changed' }]);
  assert.notEqual(capture().fingerprint, before);
  const report = validate();
  assert.ok(report.checks.some((check) => check.ruleId === 'schema.kind' && check.status === 'not_covered'));
  assert.ok(report.checks.some((check) => check.ruleId === 'entity.reference.unknown'));
});

test('symlink, malformed JSON and missing counterpart cannot pass', (t) => {
  const { root, validate } = fixture(t);
  const path = join(root, 'packages/data/games/hi3/raw-characters.json');
  rmSync(path); symlinkSync('/etc/hosts', path);
  writeFileSync(join(root, 'packages/data/games/hi3/raw-weapons.json'), 'broken');
  rmSync(join(root, 'apps/web/public/data/hi3/raw-materials.json'));
  const report = validate();
  assert.ok(report.checks.some((check) => check.ruleId === 'files.read' && check.status === 'failed'));
  assert.ok(report.checks.some((check) => check.ruleId === 'json.array' && check.status === 'failed'));
  assert.ok(report.summary.failed > 0);
});

test('draft reads enforce byte budgets, ordinary files and exact local data paths', (t) => {
  const { root } = fixture(t);
  const path = 'packages/data/games/hi3/raw-weapons.json';
  writeFileSync(join(root, path), '[]');
  assert.equal(readDraftFile(root, path, 2).toString(), '[]');
  assert.throws(() => readDraftFile(root, path, 1));
  for (const budget of [0, -1, 1.5, 4 * 1024 * 1024 + 1]) assert.throws(() => readDraftFile(root, path, budget));
  for (const unsafe of ['../outside.json', '/etc/hosts', 'packages/data/games/hi3/../hi3/raw-weapons.json']) {
    assert.throws(() => readDraftFile(root, unsafe));
  }
  rmSync(join(root, path)); mkdirSync(join(root, path));
  assert.throws(() => readDraftFile(root, path));
  rmSync(join(root, path), { recursive: true });
  symlinkSync('/etc/hosts', join(root, path));
  assert.throws(() => readDraftFile(root, path));
});

test('oversized draft input becomes a failed read, never a passing validation', (t) => {
  const { root, capture, validate } = fixture(t);
  writeFileSync(join(root, 'packages/data/games/hi3/raw-weapons.json'), ' '.repeat(4 * 1024 * 1024 + 1));
  assert.ok(capture().files.some((file) => file.path.endsWith('raw-weapons.json') && file.error));
  assert.ok(validate().checks.some((check) => check.ruleId === 'files.read' && check.status === 'failed'));
});
