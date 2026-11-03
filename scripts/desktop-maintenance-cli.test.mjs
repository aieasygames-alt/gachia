import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { maintenanceActions, maintenanceArgumentKeys, options } from './desktop-publish.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const manager = join(root, 'services/content-cms/scripts/desktop.py');
const parserProbe = join(root, 'scripts/fixtures/desktop-parser-probe.py');
const sha = 'a'.repeat(64), id = 'a'.repeat(16);
const value = key => key === '--run' ? `${id}-${'a'.repeat(12)}` : key === '--mode' ? 'recover'
  : ['--repo', '--baseline', '--evidence', '--source', '--main-source'].includes(key) ? '/tmp/fixture path'
    : ['--retention', '--recovery', '--renewal', '--bundle'].includes(key) ? id : sha;
const argsFor = action => maintenanceArgumentKeys(action).flatMap(key => [key, value(key)]);

function dispatch(args) {
  const script = `import importlib.util,json,os,sys
from unittest.mock import patch,mock_open
s=importlib.util.spec_from_file_location('manager',${JSON.stringify(manager)})
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
sys.argv=[${JSON.stringify(manager)},*json.loads(${JSON.stringify(JSON.stringify(args))})]
def record(command,**kwargs): print(json.dumps([str(x) for x in command]))
with patch.dict(os.environ,{'CI':'','GITHUB_ACTIONS':''}),patch.object(m,'settings',return_value={'app':'/tmp/fixture app'}),patch.object(m,'run',record),patch('builtins.open',mock_open()),patch.object(m.fcntl,'flock'):
 m.main()`;
  const child = spawnSync('python3', ['-B', '-c', script], { encoding: 'utf8' });
  return { ...child, command: child.status === 0 ? JSON.parse(child.stdout) : undefined };
}

test('actual manager dispatch preserves all options for every documented publication command', () => {
  const lines = readFileSync(join(root, 'docs/payload-operator-runbook.md'), 'utf8').match(/^cms publish-[^\n]+/gm);
  for (const line of lines) {
    const parts = line.match(/"[^"]*"|'[^']*'|\S+/g).map(s => s.replace(/^["']|["']$/g, ''));
    const action = parts[1].slice(8), args = parts.slice(2).map((item, i, all) => i % 2 === 0 ? item : all[i - 1] === '--mode' ? item : value(all[i - 1]));
    const valid = dispatch([parts[1], ...args]); assert.equal(valid.status, 0, valid.stderr);
    assert.equal(options(valid.command.slice(2)).action, action === 'plan' ? 'inspect' : action);
    for (const extra of [['--game', 'nte'], ['--preview'], ['--backup', '/tmp/do-not-ignore']]) {
      const child = dispatch([parts[1], ...args, ...extra]);
      if (child.status === 0) assert.throws(() => options(child.command.slice(2)), /Unknown|Unexpected|accepts no/, `${parts[1]} silently discarded ${extra[0]}`);
      else assert.equal(child.status, 2, child.stderr);
    }
  }
});

test('non-publication commands reject irrelevant options before opening files or invoking processes', () => {
  for (const args of [['content-import', '--repo', '/tmp/repo', '--game', 'genshin', '--preview'], ['status', '--run', 'unused'],
    ['restore-check', '--backup', '/tmp/backup', '--repo', '/tmp/repo'], ['content-export', '--repo', '/tmp/repo', '--game', 'nte', '--backup', '/tmp/backup']]) {
    const child = spawnSync('python3', ['-B', parserProbe, ...args], { encoding: 'utf8' });
    assert.equal(child.status, 2, child.stderr); assert.match(child.stderr, /Unexpected option for/);
  }
  for (const args of [['content-import'], ['content-export', '--repo', '/tmp/repo'], ['restore-check']]) {
    const child = spawnSync('python3', ['-B', parserProbe, ...args], { encoding: 'utf8' });
    assert.equal(child.status, 2, child.stderr); assert.match(child.stderr, /Required arguments missing/);
  }
});

for (const action of Object.keys(maintenanceActions)) {
  test(`${action} accepts only its exact pinned argument contract`, () => {
    const args = argsFor(action); assert.equal(options([action, ...args]).action, action);
    for (let i = 0; i < args.length; i += 2) {
      assert.throws(() => options([action, ...args.slice(0, i), ...args.slice(i + 2)]), /Required/);
    }
    for (const extra of ['--target', '--token', '--url', '--preview', '--game', '--percent', '--force']) {
      assert.throws(() => options([action, ...args, extra, 'anything']), /Unknown/);
    }
    assert.throws(() => options([action, ...args, args[0], args[1]]), /duplicate/);
    const bad = [...args]; bad[bad.findIndex(key => key === '--pin' || key.endsWith('-pin')) + 1] = 'not-a-sha';
    assert.throws(() => options([action, ...bad]), /SHA-256/);
  });
  test(`${action} rejects missing arguments in an actual CLI process before environment or network access`, () => {
    const child = spawnSync(process.execPath, [join(root, 'scripts/desktop-publish.mjs'), action], { encoding: 'utf8' });
    assert.equal(child.status, 1); assert.match(child.stderr, /Required arguments missing/);
  });
  test(`${action} Python manager forwards every supplied option to the Node gate`, () => {
    const fields = Object.fromEntries(argsFor(action).reduce((rows, item, i, args) => i % 2 ? rows : [...rows, [item.slice(2).replaceAll('-', '_'), args[i + 1]]], []));
    fields.action = `publish-${action}`; fields.game = 'nte'; fields.preview = false;
    const script = `import importlib.util,json,argparse
s=importlib.util.spec_from_file_location('manager',${JSON.stringify(manager)})
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
print(json.dumps(m.maintenance_arguments(argparse.Namespace(**json.loads(${JSON.stringify(JSON.stringify(fields))})))))`;
    const child = spawnSync('python3', ['-B', '-c', script], { encoding: 'utf8' });
    assert.equal(child.status, 0, child.stderr);
    const forwarded = JSON.parse(child.stdout);
    assert.throws(() => options([action, ...forwarded]), /Unknown/);
    const index = forwarded.indexOf('--game'); forwarded.splice(index, 2);
    assert.equal(options([action, ...forwarded]).action, action);
  });
}

test('renewal mode cannot change into an arbitrary operation', () => {
  const args = argsFor('evidence-renew'); args[args.indexOf('--mode') + 1] = 'deploy';
  assert.throws(() => options(['evidence-renew', ...args]), /mode/);
});

test('source-only rebinding cannot invent or accept candidate identity', () => {
  for (const key of ['--run', '--pin', '--release-key', '--repo', '--game']) {
    assert.throws(() => options(['source-rebind', ...argsFor('source-rebind'), key, value(key)]), /Unknown/);
  }
});

test('manager help exposes reviewed actions and old actions reject new evidence flags', () => {
  const help = spawnSync('python3', ['-B', parserProbe, '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0);
  for (const action of Object.keys(maintenanceActions)) assert(help.stdout.includes(`publish-${action}`));
  const invalid = spawnSync('python3', ['-B', parserProbe, 'status', '--renewal', id], { encoding: 'utf8' });
  assert.equal(invalid.status, 2); assert.match(invalid.stderr, /Unexpected option for/);
  const duplicate = spawnSync('python3', ['-B', parserProbe, 'publish-manual-recover', '--run', 'one', '--run=two'], { encoding: 'utf8' });
  assert.equal(duplicate.status, 2); assert.match(duplicate.stderr, /Duplicate/);
});

test('parser probe cannot execute runtime actions or access the real installation', () => {
  for (const action of ['status', 'install', 'serve', 'resume-install', 'publish-prepare']) {
    const child = spawnSync('python3', ['-B', parserProbe, action], { encoding: 'utf8' });
    assert.equal(child.status, 1, action);
    assert.match(child.stderr, /Parser-only probe forbids file\/process\/network access/);
  }
});

test('actual desktop manager still rejects CI before its parser or runtime', () => {
  const child = spawnSync('python3', ['-B', manager, '--help'], {
    encoding: 'utf8', env: { ...process.env, CI: 'true', GITHUB_ACTIONS: 'true' },
  });
  assert.equal(child.status, 1);
  assert.match(child.stderr, /desktop manager cannot execute in CI/);
});

test('installer module list forms a loadable dependency closure without the source checkout', t => {
  const script = `import ast,json
t=ast.parse(open(${JSON.stringify(manager)}).read());names=set()
for n in ast.walk(t):
 if isinstance(n,ast.For) and isinstance(n.iter,ast.List) and any(isinstance(x,ast.Name) and x.id=='publisher' for x in ast.walk(n)):
  for x in n.iter.elts:
   if isinstance(x,ast.Constant) and isinstance(x.value,str) and x.value.endswith('.mjs'):names.add(x.value)
print(json.dumps(sorted(names)))`;
  const child = spawnSync('python3', ['-B', '-c', script], { encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr); const names = JSON.parse(child.stdout);
  for (const name of ['desktop-published-baseline.mjs', 'desktop-evidence-renewal.mjs', 'desktop-manual-recovery.mjs', 'desktop-local-evidence.mjs', 'desktop-source-catalog.mjs', 'desktop-source-advance.mjs', 'desktop-source-rebind.mjs', 'desktop-evidence-preparation.mjs']) assert(names.includes(name));
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'cms-installed-closure-'))); t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const name of names) copyFileSync(join(root, 'scripts', name), join(dir, name));
  const source = names.map(name => `await import(${JSON.stringify(pathToFileURL(join(dir, name)).href)});`).join('\n');
  const loaded = spawnSync(process.execPath, ['--input-type=module', '-e', source], { cwd: dir, encoding: 'utf8' });
  assert.equal(loaded.status, 0, loaded.stderr);
});
