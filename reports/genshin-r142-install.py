"""R142 exact-source CMS application preparation and reversible switch; additive decision schema."""
import hashlib
import fcntl
import importlib.util
import json
import os
from pathlib import Path
import plistlib
import secrets
import shutil
import subprocess
import sys
from datetime import datetime, timezone

REPO = Path(__file__).resolve().parent.parent
REPORT = REPO / 'reports/genshin-collection-review-2026-11-21-r142'
ROOT = Path.home() / 'Library/Application Support/GachiaCMS'
SOURCE = REPO / 'services/content-cms'
COMMIT = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=REPO, text=True).strip()
NODE = '/opt/homebrew/Cellar/node/25.9.0_3/bin/node'

def run(args, **kw):
    return subprocess.run([str(x) for x in args], check=True, **kw)

def sha(file):
    return hashlib.sha256(Path(file).read_bytes()).hexdigest()

def save(name, value):
    file = REPORT / name
    with file.open('x') as stream:
        os.chmod(file, 0o600)
        json.dump(value, stream, indent=2, ensure_ascii=False)
        stream.write('\n')
    return {'path': str(file), 'pin': sha(file)}

def tracked(*paths):
    return run(['git', 'ls-tree', '-r', '--name-only', COMMIT, *paths], cwd=REPO, capture_output=True, text=True).stdout.splitlines()

def copy_exact(relative, destination):
    data = run(['git', 'show', f'{COMMIT}:{relative}'], cwd=REPO, capture_output=True).stdout
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)

def manager():
    spec = importlib.util.spec_from_file_location('r142_desktop', ROOT / 'desktop.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

def tables(cfg, desktop):
    names = json.loads(desktop.sql(cfg, "SELECT json_agg(tablename ORDER BY tablename) FROM pg_tables WHERE schemaname='public';", 'gachia_cms'))
    result = {}
    for name in names:
        relation = 'public."' + name.replace('"', '""') + '"'
        raw = desktop.sql(cfg, f"SELECT COALESCE(jsonb_agg(to_jsonb(t)::text ORDER BY to_jsonb(t)::text COLLATE \"C\"), '[]'::jsonb)::text FROM {relation} t;", 'gachia_cms')
        result[name] = {'rows': len(json.loads(raw)), 'sha256': hashlib.sha256(raw.encode()).hexdigest()}
    return result

def prepare():
    assert run(['git', 'rev-parse', 'HEAD'], cwd=REPO, capture_output=True, text=True).stdout.strip() == COMMIT
    assert not run(['git', 'status', '--porcelain', '--untracked-files=no'], cwd=REPO, capture_output=True, text=True).stdout.strip()
    assert shutil.disk_usage(REPO).free >= 10 * 2**30, 'CMS build requires 10 GiB free including 8 GiB reserve'
    cfg = json.loads((ROOT / 'settings.json').read_text()); previous = Path(cfg['app'])
    assert previous.is_dir() and not previous.is_symlink()
    old_package = json.loads((previous / 'package.json').read_text()); package = json.loads((SOURCE / 'package.json').read_text())
    assert old_package['dependencies'] == package['dependencies'] and old_package['devDependencies'] == package['devDependencies']
    assert sha(previous / 'pnpm-lock.yaml') == sha(SOURCE / 'pnpm-lock.yaml')
    intent_file = REPORT / 'application-prepare-intent.json'
    if intent_file.exists():
        intent = json.loads(intent_file.read_text())
        assert intent['sourceCommit'] == COMMIT and intent['previousApp'] == str(previous)
        app = Path(intent['app']); release = app.parent.parent
        assert app.is_dir() and not any(app.iterdir()), 'Inspect partial application before preparing again'
    else:
        stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        release = ROOT / 'releases' / f'{stamp}-genshin-review-r142-{COMMIT[:8]}'
        app = release / 'services/content-cms'; app.mkdir(parents=True)
        save('application-prepare-intent.json', {'sourceCommit': COMMIT, 'app': str(app), 'previousApp': str(previous), 'schemaMigration': True})
    build_env = {k: v for k, v in os.environ.items() if not k.startswith(('CMS_', 'PAYLOAD_', 'DATABASE_', 'D1_', 'R2_'))}
    namespace = 'r142-editor-build-' + secrets.token_hex(6)
    build_env.update(CMS_LOCAL_ONLY='1', CMS_LOCAL_NAMESPACE=namespace, PAYLOAD_SECRET=secrets.token_hex(48),
                     CMS_EDITOR_BUILD='1', NODE_ENV='production', NEXT_TELEMETRY_DISABLED='1')
    # This worktree contains only top-level links into the installed dependencies.
    # Restore a complete local tree for a standard hermetic Turbopack build.
    linked_before = SOURCE / '.local/r142-linked-dependencies-before'
    assert not linked_before.exists()
    (SOURCE / 'node_modules').rename(linked_before)
    try:
        run(['/bin/cp', '-cR', previous / 'node_modules', SOURCE / 'node_modules'])
        build_log = 'cms-build-hermetic-02.log' if (REPORT / 'cms-build-hermetic.log').exists() else 'cms-build-hermetic.log'
        with (REPORT / build_log).open('x') as log:
            run([NODE, SOURCE / 'node_modules/next/dist/bin/next', 'build'], cwd=SOURCE, env=build_env, stdout=log, stderr=log, timeout=600)
    finally:
        shutil.rmtree(SOURCE / 'node_modules', ignore_errors=True)
        linked_before.rename(SOURCE / 'node_modules')
        shutil.rmtree(SOURCE / '.local' / namespace, ignore_errors=True)
    assert not run(['git', 'status', '--porcelain', '--untracked-files=no'], cwd=REPO, capture_output=True, text=True).stdout.strip(), 'Build changed tracked source'
    cms_files = tracked('services/content-cms/src', 'services/content-cms/scripts')
    cms_files += ['services/content-cms/' + name for name in ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'next.config.mjs', 'tsconfig.json', 'tsconfig.editor.json']]
    for relative in cms_files:
        copy_exact(relative, app / Path(relative).relative_to('services/content-cms'))
    # APFS clones retain independent inodes and avoid a second physical dependency download.
    run(['/bin/cp', '-cR', previous / 'node_modules', app / 'node_modules'])
    shutil.copytree(SOURCE / '.next', app / '.next', symlinks=True, ignore=shutil.ignore_patterns('cache', 'dev'))
    old_manifest = json.loads((previous.parent.parent / 'application-manifest.json').read_text())
    release_files = set(old_manifest['releaseFiles']) | set(tracked('scripts', 'packages/core', 'packages/data/scripts'))
    release_files.update(['packages/data/package.json', 'packages/data/games/nte/character-identity.ts', 'packages/data/games/genshin/types.ts'])
    all_tracked = set(tracked())
    for relative in sorted(release_files):
        assert relative in all_tracked, f'Review retired installed dependency before removing: {relative}'
        copy_exact(relative, release / relative)
    files = {str(p.relative_to(app)): sha(p) for folder in ['src', 'scripts', '.next'] for p in sorted((app / folder).rglob('*')) if p.is_file()}
    files.update({str(Path(p).relative_to('services/content-cms')): sha(app / Path(p).relative_to('services/content-cms')) for p in cms_files})
    manifest = {'schemaVersion': 1, 'sourceCommit': COMMIT, 'app': str(app), 'previousApp': str(previous),
                'buildID': (app / '.next/BUILD_ID').read_text().strip(), 'productionSwitched': False,
                'databaseMigrationRequired': True, 'files': files, 'releaseFiles': {p: sha(release / p) for p in sorted(release_files)}}
    manifest_path = release / 'application-manifest.json'
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n'); os.chmod(manifest_path, 0o600)
    save('application-prepared.json', {'sourceCommit': COMMIT, 'app': str(app), 'previousApp': str(previous),
        'application': {'path': str(manifest_path), 'pin': sha(manifest_path)}, 'buildID': manifest['buildID'],
        'files': len(files), 'releaseFiles': len(release_files), 'databaseMigrationRequired': True})
    print(json.dumps({'prepared': True, 'app': str(app), 'files': len(files), 'releaseFiles': len(release_files)}))

def install():
    prepared = json.loads((REPORT / 'application-prepared.json').read_text())
    assert sha(prepared['application']['path']) == prepared['application']['pin']
    cfg = json.loads((ROOT / 'settings.json').read_text()); assert cfg['app'] == prepared['previousApp']
    desktop = manager()
    backup = desktop.backup(cfg)
    desktop.restore_check(cfg, backup)
    save('cold-backup.json', {'path': str(backup), 'manifestPin': sha(backup / 'manifest.json'), 'restoreCheckPin': sha(backup / 'restore-check.json')})
    upgrade = ROOT / 'application-upgrades' / ('genshin-review-r142-' + COMMIT[:12]); upgrade.mkdir(mode=0o700)
    shutil.copy2(ROOT / 'settings.json', upgrade / 'settings.before.json')
    agent = desktop.agent_file('payload'); shutil.copy2(agent, upgrade / 'agent.before.plist')
    desktop.stop('payload')
    try:
        before = tables(cfg, desktop); save('database-before-install.json', before)
        # Install the isolated-PostgreSQL-tested additive decision table; existing rows must remain exact.
        cfg['app'] = prepared['app']
        temporary = ROOT / 'settings.r142.pending.json'
        temporary.write_text(json.dumps(cfg, indent=2) + '\n'); os.chmod(temporary, 0o600); temporary.replace(ROOT / 'settings.json')
        spec = plistlib.loads(agent.read_bytes()); spec['WorkingDirectory'] = prepared['app']
        agent.write_bytes(plistlib.dumps(spec)); os.chmod(agent, 0o600)
        run([NODE, Path(prepared['app']) / 'node_modules/payload/bin.js', 'migrate'], cwd=prepared['app'], env=desktop.app_env(cfg))
        desktop.start('payload'); desktop.wait_cms()
        after = tables(cfg, desktop); save('database-after-install.json', after)
        assert set(after) == set(before) | {'genshin_review_decisions'}
        assert after['genshin_review_decisions']['rows'] == 0
        assert all(before[name] == after[name] for name in before if name != 'payload_migrations'), 'Additive migration changed existing content or history'
        assert after['payload_migrations']['rows'] == before['payload_migrations']['rows'] + 1
        save('application-installed.json', {**prepared, 'backup': str(backup), 'upgradeBackup': str(upgrade),
             'healthy': True, 'allExistingContentAndHistoryUnchanged': True, 'schemaMigrationRun': True, 'previousApplicationPreserved': True})
        print(json.dumps({'installed': True, 'healthy': True, 'allExistingContentAndHistoryUnchanged': True}))
    except BaseException:
        desktop.stop('payload')
        shutil.copy2(upgrade / 'settings.before.json', ROOT / 'settings.json')
        shutil.copy2(upgrade / 'agent.before.plist', agent)
        desktop.start('payload'); desktop.wait_cms()
        raise

if __name__ == '__main__':
    assert len(sys.argv) == 2 and sys.argv[1] in ['prepare', 'install', 'table-snapshot']
    if sys.argv[1] == 'prepare': prepare()
    else:
        with (ROOT / 'maintenance.lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            if sys.argv[1] == 'install': install()
            else: save('database-after-stage.json', tables(json.loads((ROOT / 'settings.json').read_text()), manager()))
