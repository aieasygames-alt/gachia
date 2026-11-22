"""R147: install the CI-verified R146 source reader; preserve runtime dependencies and all CMS data."""
import fcntl
import gzip
import hashlib
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
REPORT = REPO / 'reports/cms-source-reader-2026-11-22-r147'
SOURCE = REPO / 'services/content-cms'
ROOT = Path.home() / 'Library/Application Support/GachiaCMS'
NODE = '/opt/homebrew/Cellar/node/25.9.0_3/bin/node'

def load(name, file):
    spec = importlib.util.spec_from_file_location(name, file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

helpers = load('r147_install_helpers', REPO / 'reports/genshin-r144-install.py')

def run(args, **kwargs):
    return subprocess.run([str(x) for x in args], check=True, **kwargs)

def sha(file):
    return hashlib.sha256(Path(file).read_bytes()).hexdigest()

def save(name, value):
    file = REPORT / name
    with file.open('x') as stream:
        os.chmod(file, 0o600)
        json.dump(value, stream, indent=2, ensure_ascii=False)
        stream.write('\n')
    return {'path': str(file), 'pin': sha(file)}

def inventory(folder):
    result = {}
    for file in sorted(folder.rglob('*')):
        relative = str(file.relative_to(folder))
        if file.is_symlink():
            result[relative] = {'symlink': os.readlink(file)}
        elif file.is_file():
            result[relative] = {'sha256': sha(file)}
    return result

def state(cfg, desktop):
    return {'tables': helpers.tables(cfg, desktop),
            'canonicalDatabaseSHA256': desktop.canonical_data_digest(cfg, 'gachia_cms'),
            'media': desktop.file_digests(ROOT / 'data')}

def prepare():
    assert not run(['git', 'status', '--porcelain', '--untracked-files=no'], cwd=REPO, capture_output=True, text=True).stdout.strip()
    assert shutil.disk_usage(REPO).free >= 10 * 2**30, 'CMS build requires 10 GiB including 8 GiB reserve'
    cfg = json.loads((ROOT / 'settings.json').read_text())
    previous = Path(cfg['app'])
    commit = run(['git', 'rev-parse', 'HEAD'], cwd=REPO, capture_output=True, text=True).stdout.strip()
    before = json.loads((previous / 'package.json').read_text())
    after = json.loads((SOURCE / 'package.json').read_text())
    assert before == after, 'Source-reader installation must preserve package definitions'
    assert sha(previous / 'pnpm-lock.yaml') == sha(SOURCE / 'pnpm-lock.yaml'), 'CMS lock must remain exact'
    assert json.loads((SOURCE / 'node_modules/next/package.json').read_text())['version'] == '16.4.6'
    assert not (SOURCE / 'node_modules/.pnpm').is_symlink(), 'Build must own its dependencies'
    ci = json.loads((REPO / 'reports/public-next-security-2026-11-21-r146/closeout-ci-final.json').read_text())
    assert ci['headSha'] == commit and ci['status'] == 'completed' and ci['conclusion'] == 'success'
    release = ROOT / 'releases' / (datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-cms-source-reader-r147-' + commit[:8])
    app = release / 'services/content-cms'
    app.mkdir(parents=True)
    save('application-prepare-intent.json', {'sourceCommit': commit, 'app': str(app), 'previousApp': str(previous), 'schemaMigration': False})
    namespace = 'r147-editor-build-' + secrets.token_hex(6)
    env = {k: v for k, v in os.environ.items() if not k.startswith(('CMS_', 'PAYLOAD_', 'DATABASE_', 'D1_', 'R2_'))}
    env.update(CMS_LOCAL_ONLY='1', CMS_LOCAL_NAMESPACE=namespace, PAYLOAD_SECRET=secrets.token_hex(48),
               CMS_EDITOR_BUILD='1', NODE_ENV='production', NEXT_TELEMETRY_DISABLED='1')
    try:
        with (REPORT / 'cms-build.log').open('x') as log:
            run([NODE, SOURCE / 'node_modules/next/dist/bin/next', 'build'], cwd=SOURCE, env=env, stdout=log, stderr=log, timeout=600)
    finally:
        shutil.rmtree(SOURCE / '.local' / namespace, ignore_errors=True)
    assert not run(['git', 'status', '--porcelain', '--untracked-files=no'], cwd=REPO, capture_output=True, text=True).stdout.strip()
    cms_files = helpers.tracked('services/content-cms/src', 'services/content-cms/scripts')
    cms_files += ['services/content-cms/' + name for name in ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'next.config.mjs', 'tsconfig.json', 'tsconfig.editor.json']]
    for relative in cms_files:
        helpers.copy_exact(relative, app / Path(relative).relative_to('services/content-cms'))
    run(['/bin/cp', '-cR', SOURCE / 'node_modules', app / 'node_modules'])
    dependency_files = inventory(SOURCE / 'node_modules')
    assert inventory(app / 'node_modules') == dependency_files
    dependency_manifest = REPORT / 'cms-dependency-files.json.gz'
    with dependency_manifest.open('xb') as stream:
        stream.write(gzip.compress((json.dumps(dependency_files, sort_keys=True) + '\n').encode(), mtime=0))
    shutil.copytree(SOURCE / '.next', app / '.next', symlinks=True, ignore=shutil.ignore_patterns('cache', 'dev'))
    old_manifest = json.loads((previous.parent.parent / 'application-manifest.json').read_text())
    release_files = set(old_manifest['releaseFiles']) | set(helpers.tracked('scripts', 'packages/core', 'packages/data/scripts'))
    release_files.update(['packages/data/package.json', 'packages/data/games/nte/character-identity.ts', 'packages/data/games/genshin/types.ts'])
    tracked = set(helpers.tracked())
    for relative in sorted(release_files):
        assert relative in tracked
        helpers.copy_exact(relative, release / relative)
    runtime = load('r147_runtime_dependencies', REPO / 'reports/genshin-r144-runtime-dependencies.py')
    runtime_proof = save('runtime-dependencies.json', {'packages': runtime.install_dependencies(release)})
    files = {str(p.relative_to(app)): sha(p) for folder in ['src', 'scripts', '.next'] for p in sorted((app / folder).rglob('*')) if p.is_file()}
    files.update({str(Path(p).relative_to('services/content-cms')): sha(app / Path(p).relative_to('services/content-cms')) for p in cms_files})
    manifest = {'schemaVersion': 1, 'sourceCommit': commit, 'app': str(app), 'previousApp': str(previous),
                'buildID': (app / '.next/BUILD_ID').read_text().strip(), 'nextVersion': '16.4.6',
                'databaseMigrationRequired': False, 'files': files,
                'dependencyFiles': {'path': str(dependency_manifest), 'pin': sha(dependency_manifest), 'entries': len(dependency_files)},
                'releaseFiles': {p: sha(release / p) for p in sorted(release_files)}}
    manifest_path = release / 'application-manifest.json'
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n'); os.chmod(manifest_path, 0o600)
    save('application-prepared.json', {key: manifest[key] for key in ['sourceCommit', 'app', 'previousApp', 'buildID', 'nextVersion', 'databaseMigrationRequired']} |
         {'application': {'path': str(manifest_path), 'pin': sha(manifest_path)}, 'runtimeDependencies': runtime_proof,
          'files': len(files), 'releaseFiles': len(release_files), 'dependencyFiles': manifest['dependencyFiles']})
    print(json.dumps({'prepared': True, 'app': str(app), 'nextVersion': '16.4.6', 'dependencyEntries': len(dependency_files)}))

def install():
    assert json.loads((REPORT / 'postgres-smoke/postgres-smoke.json').read_text())['passed']
    assert json.loads((REPORT / 'prepared-reader.json').read_text())['allOwnersCurrent']
    prepared = json.loads((REPORT / 'application-prepared.json').read_text())
    cfg = json.loads((ROOT / 'settings.json').read_text())
    assert cfg['app'] == prepared['previousApp']
    assert sha(prepared['application']['path']) == prepared['application']['pin']
    manifest = json.loads(Path(prepared['application']['path']).read_text())
    app = Path(prepared['app'])
    for name, pin in manifest['files'].items():
        assert sha(app / name) == pin, name
    for name, pin in manifest['releaseFiles'].items():
        assert sha(app.parent.parent / name) == pin, name
    expected_dependencies = json.loads(gzip.decompress(Path(manifest['dependencyFiles']['path']).read_bytes()))
    assert inventory(app / 'node_modules') == expected_dependencies
    desktop = helpers.manager()
    backup = desktop.backup(cfg)
    desktop.restore_check(cfg, backup)
    save('cold-backup.json', {'path': str(backup), 'manifestPin': sha(backup / 'manifest.json'), 'restoreCheckPin': sha(backup / 'restore-check.json')})
    upgrade = ROOT / 'application-upgrades' / ('cms-source-reader-r147-' + prepared['sourceCommit'][:12])
    upgrade.mkdir(mode=0o700)
    shutil.copy2(ROOT / 'settings.json', upgrade / 'settings.before.json')
    agent = desktop.agent_file('payload')
    shutil.copy2(agent, upgrade / 'agent.before.plist')
    desktop.stop('payload')
    try:
        before = state(cfg, desktop)
        assert before == json.loads((REPORT / 'database-before.json').read_text()), 'CMS changed while preparing upgrade'
        save('database-before-install.json', before)
    except BaseException:
        desktop.start('payload'); desktop.wait_cms()
        raise

    def switch(target):
        cfg['app'] = target
        temporary = ROOT / 'settings.r147.pending.json'
        temporary.write_text(json.dumps(cfg, indent=2) + '\n'); os.chmod(temporary, 0o600)
        temporary.replace(ROOT / 'settings.json')
        spec = plistlib.loads(agent.read_bytes()); spec['WorkingDirectory'] = target
        agent.write_bytes(plistlib.dumps(spec)); os.chmod(agent, 0o600)
        desktop.start('payload'); desktop.wait_cms()

    try:
        switch(prepared['app'])
        after = state(cfg, desktop)
        assert after == before, 'Upgraded application changed database/media'
        save('database-after-install.json', after)
        # Rehearse the complete old application switch, then leave the patched app active.
        desktop.stop('payload'); switch(prepared['previousApp'])
        assert state(cfg, desktop) == before
        save('application-recovery.json', {'restoredPreviousApp': prepared['previousApp'], 'healthy': True, 'databaseAndMediaUnchanged': True})
        desktop.stop('payload'); switch(prepared['app'])
        assert state(cfg, desktop) == before
        save('application-installed.json', {**prepared, 'backup': str(backup), 'upgradeBackup': str(upgrade),
             'healthy': True, 'allDatabaseAndMediaUnchanged': True, 'schemaMigrationRun': False,
             'previousApplicationRecoveryRehearsed': True, 'previousApplicationPreserved': True})
        print(json.dumps({'installed': True, 'nextVersion': '16.4.6', 'healthy': True, 'databaseAndMediaUnchanged': True, 'recoveryRehearsed': True}))
    except BaseException:
        desktop.stop('payload')
        shutil.copy2(upgrade / 'settings.before.json', ROOT / 'settings.json')
        shutil.copy2(upgrade / 'agent.before.plist', agent)
        desktop.start('payload'); desktop.wait_cms()
        raise

if __name__ == '__main__':
    assert len(sys.argv) == 2 and sys.argv[1] in ['prepare', 'install', 'final-state']
    if sys.argv[1] == 'prepare':
        prepare()
    else:
        with (ROOT / 'maintenance.lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            if sys.argv[1] == 'install':
                install()
            else:
                final = state(json.loads((ROOT / 'settings.json').read_text()), helpers.manager())
                assert final == json.loads((REPORT / 'database-before.json').read_text())
                save('database-final.json', final)
                print('All database tables, sequences and media match the pre-upgrade state.')
