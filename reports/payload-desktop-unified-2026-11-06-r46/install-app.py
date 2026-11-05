"""Install the pinned, tested additive upgrade; retain the old app and schema on rollback."""
import datetime
import fcntl
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import plistlib
import secrets
import shutil
import subprocess
import time

os.umask(0o077)
report = Path(__file__).resolve().parent
repo = report.parents[1]
root = Path.home() / 'Library/Application Support/GachiaCMS'
read = lambda file: json.loads(file.read_text())
sha = lambda file: hashlib.sha256(file.read_bytes()).hexdigest()
stage = read(report / 'staged-app.json')
ci = read(report / 'github-code-result.json')
assert ci['headSha'] == stage['sourceCommit'] and ci['conclusion'] == 'success' and ci['status'] == 'completed'
runtime = read(report / 'staged-runtime.json')
assert runtime['passed'] and runtime['sourceCommit'] == stage['sourceCommit'] and runtime['legacyRowsAndVersionsPreserved']
assert read(report / 'postgres/postgres-smoke.json')['passed']
assert sha(Path(stage['manifestPath'])) == stage['manifestSHA256']
app = Path(stage['app'])
manifest = read(Path(stage['manifestPath']))
assert all(sha(app / name) == pin for name, pin in manifest['files'].items())
assert all(sha(app.parents[1] / name) == pin for name, pin in manifest['releaseFiles'].items())
spec = importlib.util.spec_from_file_location('upgrade_manager', root / 'desktop.py')
manager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(manager)
before = read(report / 'resident-before.json')
manager_bytes = subprocess.check_output(['git', 'show', stage['sourceCommit'] + ':services/content-cms/scripts/desktop.py'], cwd=repo)
assert (repo / 'services/content-cms/scripts/desktop.py').read_bytes() == manager_bytes
assert shutil.disk_usage(root).free > 8 * 1024**3

def replace(file, value):
    temporary = file.with_name(file.name + '.r46-' + secrets.token_hex(6))
    with temporary.open('xb') as stream:
        stream.write(value)
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temporary, file)

def projected(cfg):
    tables = json.loads(manager.sql(cfg, "SELECT json_agg(tablename ORDER BY tablename COLLATE \"C\") FROM pg_tables WHERE schemaname='public' AND tablename <> 'payload_migrations';", 'gachia_cms'))
    parts = []
    for table in tables:
        relation = 'public."' + table.replace('"', '""') + '"'
        literal = "'" + table.replace("'", "''") + "'"
        parts.append(f"jsonb_build_object('table',{literal},'rows',(SELECT COALESCE(jsonb_agg(row ORDER BY row::text COLLATE \"C\"),'[]'::jsonb) FROM (SELECT to_jsonb(t)-'structured_value'-'version_structured_value' AS row FROM {relation} t) q))")
    data = json.loads(manager.sql(cfg, 'SELECT jsonb_build_array(' + ','.join(parts) + ');', 'gachia_cms'))
    return hashlib.sha256(json.dumps(data, sort_keys=True, separators=(',', ':'), ensure_ascii=True).encode()).hexdigest()

with (root / 'maintenance.lock').open('a') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    cfg = manager.settings()
    assert cfg['app'] == stage['previousApp'] and manager.health()
    assert manager.canonical_data_digest(cfg, 'gachia_cms') == before['canonicalDataDigest']
    assert sha(root / 'desktop.py') == before['managerSHA256']
    assert {file.name: sha(file) for file in (root / 'publisher').glob('*.mjs')} == before['publisherDigests']
    assert manager.file_digests(root / 'data') == before['mediaDigests']
    upgrade = root / 'application-upgrades' / ('unified-r46-' + secrets.token_hex(6))
    upgrade.mkdir(parents=True, mode=0o700)
    settings_path, agent_path = root / 'settings.json', manager.agent_file('payload')
    original = {settings_path: settings_path.read_bytes(), agent_path: agent_path.read_bytes(), root / 'desktop.py': (root / 'desktop.py').read_bytes()}
    for name, source in [('settings.before.json', settings_path), ('agent.before.plist', agent_path), ('desktop.before.py', root / 'desktop.py')]:
        shutil.copy2(source, upgrade / name)
    backup = manager.backup(cfg)
    backup_manifest = read(backup / 'manifest.json')
    assert backup_manifest['canonicalDataDigest'] == before['canonicalDataDigest']
    assert all(sha(backup / name) == pin for name, pin in backup_manifest['files'].items())
    result = {'at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'sourceCommit': stage['sourceCommit'],
        'app': str(app), 'previousApp': cfg['app'], 'upgradeBackup': str(upgrade), 'coldBackup': str(backup),
        'coldBackupManifestPin': sha(backup / 'manifest.json'), 'manifestSHA256': stage['manifestSHA256'],
        'schemaMigrationRun': False, 'cloudWrites': False, 'contentWrites': False, 'previousApplicationPreserved': True}
    try:
        manager.stop('payload')
        for _ in range(30):
            if not manager.health():
                break
            time.sleep(0.5)
        assert not manager.health()
        assert manager.canonical_data_digest(cfg, 'gachia_cms') == before['canonicalDataDigest']
        with (report / 'resident-migration.log').open('x') as log:
            subprocess.run([manager.NODE, str(app / 'node_modules/payload/bin.js'), 'migrate'], cwd=app,
                env=manager.app_env(cfg), stdout=log, stderr=subprocess.STDOUT, check=True, timeout=120)
        result['schemaMigrationRun'] = True
        assert projected(cfg) == before['projectedLegacyDataSHA256']
        assert manager.sql(cfg, 'SELECT (SELECT count(*) FROM users),(SELECT count(*) FROM content_records),(SELECT count(*) FROM media);', 'gachia_cms') == '1|85|1'
        assert manager.file_digests(root / 'data') == before['mediaDigests']
        cfg['app'] = str(app)
        agent = plistlib.loads(original[agent_path])
        agent['WorkingDirectory'] = str(app)
        replace(settings_path, (json.dumps(cfg, indent=2) + '\n').encode())
        replace(agent_path, plistlib.dumps(agent))
        replace(root / 'desktop.py', manager_bytes)
        os.chmod(root / 'desktop.py', 0o700)
        manager.start('payload')
        manager.wait_cms()
        assert projected(cfg) == before['projectedLegacyDataSHA256']
        assert all(sha(app / name) == pin for name, pin in manifest['files'].items())
        assert all(sha(app.parents[1] / name) == pin for name, pin in manifest['releaseFiles'].items())
        assert {file.name: sha(file) for file in (root / 'publisher').glob('*.mjs')} == before['publisherDigests']
        result.update(status='installed_and_healthy', legacyRowsAndVersionsPreserved=True, counts='1|85|1',
            projectedLegacyDataSHA256=projected(cfg), applicationFilesVerified=len(manifest['files']), releaseFilesVerified=len(manifest['releaseFiles']),
            publisherUnchanged=True, managerSHA256=sha(root / 'desktop.py'), mediaUnchanged=True)
        with (report / 'installation.json').open('x') as stream:
            json.dump(result, stream, indent=2)
            stream.write('\n')
        with (upgrade / 'installed.json').open('x') as stream:
            json.dump(result, stream, indent=2)
            stream.write('\n')
    except BaseException as error:
        manager.stop('payload')
        for file, value in original.items():
            replace(file, value)
        manager.start('payload')
        manager.wait_cms()
        result.update(status='failed_previous_application_restored', error=type(error).__name__,
            additiveSchemaRetained=True, healthy=manager.health())
        with (report / 'installation-failure.json').open('x') as stream:
            json.dump(result, stream, indent=2)
            stream.write('\n')
        raise
print(json.dumps(result, indent=2))
