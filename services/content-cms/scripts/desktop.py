#!/usr/bin/env python3
"""Manage the local CMS and pinned releases; explicit promote/recover commands can switch public traffic."""
import argparse
import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path
import plistlib
import secrets
import shutil
import socket
import subprocess
import sys
import tarfile
import time
import urllib.request
from urllib.parse import urlparse

ROOT = Path.home() / 'Library/Application Support/GachiaCMS'
AGENTS = Path.home() / 'Library/LaunchAgents'
PG = Path('/opt/homebrew/opt/postgresql@17/bin')
NODE = '/opt/homebrew/bin/node'
MAINTENANCE_ACTIONS = ['assets-refresh', 'recovery-local-prepare', 'baseline-capture', 'baseline-bind', 'evidence-renew', 'cloud-promote-renewed', 'manual-recover']


def maintenance_arguments(args):
    # Forward every supplied option so the Node whitelist rejects extras, never silently drops them.
    command = []
    for key, value in vars(args).items():
        if key == 'action' or value is None or value is False:
            continue
        command.extend(['--' + key.replace('_', '-'), str(value.resolve() if isinstance(value, Path) else value)])
    return command

LABELS = {'postgres': 'com.gachia.cms.postgres', 'payload': 'com.gachia.cms.payload'}
DOMAIN = f'gui/{os.getuid()}'


def write_private(file, content):
    with open(file, 'x', encoding='utf8') as stream:
        os.chmod(file, 0o600)
        stream.write(content)


def settings():
    return json.loads((ROOT / 'settings.json').read_text())


def app_env(cfg):
    env = dict(os.environ)
    for key in ['CMS_LOCAL_ONLY', 'CMS_LOCAL_NAMESPACE', 'CMS_SHADOW_READER', 'CMS_PG_SCHEMA_PUSH',
                'PAYLOAD_DROP_DATABASE', 'D1_DATABASE_ID', 'R2_BUCKET', 'CI', 'GITHUB_ACTIONS']:
        env.pop(key, None)
    env.update(cfg['environment'])
    env.update(NODE_ENV='production', NEXT_TELEMETRY_DISABLED='1', PATH='/opt/homebrew/bin:/usr/bin:/bin')
    return env


def run(args, **kwargs):
    return subprocess.run([str(arg) for arg in args], check=True, **kwargs)


def pg_env(cfg):
    return dict(os.environ, PGHOST='127.0.0.1', PGPORT='54329', PGUSER='gachia_owner',
                PGPASSWORD=cfg['postgresAdminPassword'], PGDATABASE='postgres')


def sql(cfg, statement, database='postgres'):
    return run([PG / 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-At', '-d', database],
               env=pg_env(cfg), input=statement, text=True, capture_output=True).stdout.strip()


def logical_digest(cfg, database):
    data = run([PG / 'pg_dump', '--data-only', '--inserts', '--no-owner', '--no-privileges', '-d', database],
               env=pg_env(cfg), capture_output=True).stdout
    # PostgreSQL randomizes psql restriction tokens; those are not database data.
    stable = b'\n'.join(line for line in data.splitlines() if not line.startswith((b'\\restrict ', b'\\unrestrict ')))
    return hashlib.sha256(stable).hexdigest()


def file_digests(directory):
    return {str(item.relative_to(directory)): hashlib.sha256(item.read_bytes()).hexdigest()
            for item in sorted(directory.rglob('*')) if item.is_file()}


def agent_file(name):
    return AGENTS / f'{LABELS[name]}.plist'


def loaded(name):
    return subprocess.run(['launchctl', 'print', f'{DOMAIN}/{LABELS[name]}'], capture_output=True).returncode == 0


def start(name):
    if not loaded(name):
        run(['launchctl', 'bootstrap', DOMAIN, agent_file(name)])


def stop(name):
    if loaded(name):
        run(['launchctl', 'bootout', DOMAIN, agent_file(name)])


def wait_database(cfg):
    for _ in range(45):
        try:
            if sql(cfg, 'SELECT 1') == '1':
                return
        except subprocess.CalledProcessError:
            pass
        time.sleep(1)
    raise RuntimeError('Local PostgreSQL did not become ready; inspect private logs.')


def health():
    try:
        with urllib.request.urlopen('http://127.0.0.1:3100/health', timeout=8) as response:
            return response.status == 200
    except Exception:
        return False


def wait_cms():
    for _ in range(60):
        if health():
            return
        time.sleep(1)
    raise RuntimeError('CMS did not become ready; inspect private logs.')


def create_agent(name, args, cwd):
    file = agent_file(name)
    if file.exists():
        raise RuntimeError(f'Refusing to overwrite existing launch agent: {file}')
    data = {'Label': LABELS[name], 'ProgramArguments': [str(arg) for arg in args],
            'WorkingDirectory': str(cwd), 'RunAtLoad': True, 'KeepAlive': True, 'ThrottleInterval': 10,
            'EnvironmentVariables': {'LC_ALL': 'en_US.UTF-8', 'LANG': 'en_US.UTF-8'},
            'Umask': 0o077, 'StandardOutPath': str(ROOT / 'logs' / f'{name}.log'),
            'StandardErrorPath': str(ROOT / 'logs' / f'{name}.error.log')}
    with open(file, 'xb') as stream:
        os.chmod(file, 0o600)
        plistlib.dump(data, stream)


def install():
    if sys.platform != 'darwin' or not (PG / 'pg_dump').exists():
        raise RuntimeError('Install Homebrew postgresql@17 on macOS first.')
    if ROOT.exists() or any(agent_file(name).exists() for name in LABELS):
        raise RuntimeError('Installation already exists; refusing to overwrite data or credentials.')
    for port in [3100, 54329]:
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', port))
    source = Path(__file__).resolve().parents[1]
    if shutil.disk_usage(ROOT.parent).free < 5 * 1024**3:
        raise RuntimeError('At least 5 GiB free disk is required for installation and a recovery rehearsal.')
    ROOT.mkdir(mode=0o700)
    for directory in ['data', 'postgres', 'logs', 'run', 'backups', 'releases', 'publish']:
        (ROOT / directory).mkdir(mode=0o700)
    release = ROOT / 'releases' / datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    app = release / 'services/content-cms'
    app.mkdir(parents=True)
    admin_password, db_password = secrets.token_hex(32), secrets.token_hex(32)
    cfg = {'schemaVersion': 1, 'app': str(app), 'source': str(source), 'postgresAdminPassword': admin_password,
           'environment': {'CMS_MODE': 'desktop', 'CMS_SERVER_URL': 'http://127.0.0.1:3100',
             'CMS_DATA_DIR': str(ROOT / 'data'), 'PAYLOAD_SECRET': secrets.token_hex(48),
             'DATABASE_URL': f'postgres://gachia_app:{db_password}@127.0.0.1:54329/gachia_cms'}}
    write_private(ROOT / 'settings.json', json.dumps(cfg, indent=2) + '\n')
    shutil.copyfile(__file__, ROOT / 'desktop.py')
    os.chmod(ROOT / 'desktop.py', 0o700)
    pwfile = ROOT / 'run/initdb-password'
    write_private(pwfile, admin_password + '\n')
    with open(ROOT / 'logs/install.log', 'a') as log:
        try:
            run([PG / 'initdb', '-D', ROOT / 'postgres', '-U', 'gachia_owner', '--auth=scram-sha-256',
                 '--encoding=UTF8', '--locale=C', f'--pwfile={pwfile}'], stdout=log, stderr=log)
        finally:
            pwfile.unlink(missing_ok=True)
        create_agent('postgres', [PG / 'postgres', '-D', ROOT / 'postgres', '-p', '54329',
                                  '-h', '127.0.0.1', '-k', ROOT / 'run'], ROOT)
        start('postgres')
        wait_database(cfg)
    complete_install(cfg)


def complete_install(cfg):
    source, app = Path(cfg['source']), Path(cfg['app'])
    release, repo = app.parents[1], source.parents[1]
    if (ROOT / 'initial-admin.txt').exists() or any(app.iterdir()):
        raise RuntimeError('Refusing to overwrite an initialized application; installation recovery requires inspection.')
    db_password = urlparse(cfg['environment']['DATABASE_URL']).password
    if not db_password or any(c not in '0123456789abcdef' for c in db_password):
        raise RuntimeError('Invalid generated database password')
    with open(ROOT / 'logs/install.log', 'a') as log:
        sql(cfg, f"CREATE ROLE gachia_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '{db_password}';")
        sql(cfg, 'CREATE DATABASE gachia_cms OWNER gachia_app;')
        env = app_env(cfg)
        env['CMS_EDITOR_BUILD'] = '1'
        run([NODE, source / 'node_modules/next/dist/bin/next', 'build'], cwd=source, env=env, stdout=log, stderr=log)
        # A self-contained installed copy, not a symlink into a disposable worktree.
        for name in ['src', 'scripts', 'node_modules', '.next']:
            shutil.copytree(source / name, app / name, symlinks=True,
                            ignore=shutil.ignore_patterns('cache') if name == '.next' else None)
        for name in ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'next.config.mjs', 'tsconfig.json', 'tsconfig.editor.json']:
            shutil.copy2(source / name, app / name)
        shutil.copytree(repo / 'packages/core', release / 'packages/core',
                        ignore=shutil.ignore_patterns('node_modules', '.turbo', '*.tsbuildinfo'))
        run([NODE, app / 'node_modules/payload/bin.js', 'migrate'], cwd=app, env=env, stdout=log, stderr=log)
        login_password = secrets.token_urlsafe(32)
        write_private(ROOT / 'initial-admin.txt', 'URL: http://127.0.0.1:3100/admin\nEmail: owner@localhost.invalid\nPassword: ' + login_password + '\nChange this password after first login.\n')
        run([NODE, '--import', 'tsx', 'scripts/editor-admin.ts'], cwd=app,
            env=dict(env, CMS_ADMIN_EMAIL='owner@localhost.invalid', CMS_ADMIN_PASSWORD=login_password), stdout=log, stderr=log)
    publisher = ROOT / 'publisher'
    publisher.mkdir(mode=0o700)
    for name in ['desktop-publish.mjs', 'verify-worker-artifact.mjs', 'desktop-release-assets.mjs',
                 'desktop-cloud-release.mjs', 'desktop-cloud-transport.mjs', 'desktop-version-preview.mjs', 'desktop-release-readiness.mjs',
                 'desktop-recovery-cloud.mjs', 'desktop-public-acceptance.mjs', 'retain-game-assets.mjs', 'retain-web-assets.mjs']:
        shutil.copy2(repo / 'scripts' / name, publisher / name)
    for name in ['desktop-recovery-receipt.mjs', 'desktop-promotion-request.mjs', 'desktop-promotion-transport.mjs',
                 'desktop-published-baseline.mjs', 'desktop-evidence-renewal.mjs', 'desktop-manual-recovery.mjs',
                 'desktop-release-scope.mjs', 'desktop-local-evidence.mjs']:
        shutil.copy2(repo / 'scripts' / name, publisher / name)
    create_agent('payload', [sys.executable, ROOT / 'desktop.py', 'serve'], app)
    start('payload')
    wait_cms()
    print('Installed persistent local CMS at http://127.0.0.1:3100/admin; credentials saved privately to initial-admin.txt.')


def backup(cfg):
    destination = ROOT / 'backups' / (datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + secrets.token_hex(3))
    destination.mkdir(mode=0o700)
    was_running = loaded('payload')
    try:
        stop('payload')
        for _ in range(30):
            if not health():
                break
            time.sleep(1)
        else:
            raise RuntimeError('CMS must stop before the combined backup.')
        run([PG / 'pg_dump', '-Fc', '-d', 'gachia_cms', '-f', destination / 'database.dump'], env=pg_env(cfg), capture_output=True)
        with tarfile.open(destination / 'media.tar.gz', 'w:gz') as archive:
            archive.add(ROOT / 'data', arcname='data')
        shutil.copy2(ROOT / 'settings.json', destination / 'settings.json')
        files = {name: hashlib.sha256((destination / name).read_bytes()).hexdigest()
                 for name in ['database.dump', 'media.tar.gz', 'settings.json']}
        counts = sql(cfg, 'SELECT (SELECT count(*) FROM users), (SELECT count(*) FROM content_records), (SELECT count(*) FROM media);', 'gachia_cms')
        manifest = {'schemaVersion': 1, 'app': cfg['app'], 'files': files, 'counts': counts,
                    'logicalDigest': logical_digest(cfg, 'gachia_cms'), 'mediaDigests': file_digests(ROOT / 'data'),
                    'encrypted': False, 'offsite': False}
        write_private(destination / 'manifest.json', json.dumps(manifest, indent=2) + '\n')
    finally:
        if was_running:
            start('payload')
            wait_cms()
    print('Combined local backup created:', destination)
    return destination


def restore_check(cfg, directory):
    directory = directory.resolve()
    if directory.parent != (ROOT / 'backups').resolve():
        raise RuntimeError('Only an installed local backup can be rehearsed.')
    manifest = json.loads((directory / 'manifest.json').read_text())
    for name, expected in manifest['files'].items():
        if name not in ['database.dump', 'media.tar.gz', 'settings.json'] or hashlib.sha256((directory / name).read_bytes()).hexdigest() != expected:
            raise RuntimeError('Backup integrity mismatch.')
    database = 'gachia_cms_restore_' + secrets.token_hex(6)
    extracted = ROOT / 'run' / database
    sql(cfg, f'CREATE DATABASE {database};')
    try:
        run([PG / 'pg_restore', '--exit-on-error', '--no-owner', '-d', database, directory / 'database.dump'], env=pg_env(cfg), capture_output=True)
        counts = sql(cfg, 'SELECT (SELECT count(*) FROM users), (SELECT count(*) FROM content_records), (SELECT count(*) FROM media);', database)
        if counts != manifest['counts']:
            raise RuntimeError('Restored counts differ.')
        if logical_digest(cfg, database) != manifest['logicalDigest']:
            raise RuntimeError('Restored logical database data differs.')
        with tarfile.open(directory / 'media.tar.gz') as archive:
            for member in archive.getmembers():
                parts = Path(member.name).parts
                if not parts or parts[0] != 'data' or '..' in parts or not (member.isdir() or member.isfile()):
                    raise RuntimeError('Unsafe media archive member')
            archive.extractall(extracted)
        restored_media = file_digests(extracted / 'data')
        if restored_media != manifest['mediaDigests']:
            raise RuntimeError('Restored media bytes differ.')
        media_count = len(restored_media)
        result = {'passed': True, 'counts': counts, 'mediaFiles': media_count, 'backup': directory.name,
                  'scope': 'isolated PostgreSQL restore and media extraction; no live replacement'}
        write_private(directory / 'restore-check.json', json.dumps(result, indent=2) + '\n')
        print(json.dumps(result))
    finally:
        sql(cfg, f'DROP DATABASE {database};')
        shutil.rmtree(extracted, ignore_errors=True)


def main():
    os.umask(0o077)
    if os.environ.get('CI') or os.environ.get('GITHUB_ACTIONS'):
        raise RuntimeError('The desktop manager cannot execute in CI.')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['install', 'resume-install', 'serve', 'status', 'start', 'stop', 'backup', 'restore-check', 'content-import', 'content-export',
                                         'publish-plan', 'publish-prepare', 'publish-build', 'publish-preview', 'publish-verify',
                                         'publish-retain', 'publish-verify-retained', 'publish-preview-retained', 'publish-cloud-check',
                                         'publish-cloud-prepare', 'publish-cloud-verify', 'publish-cloud-upload-preview',
                                         'publish-cloud-reconcile', 'publish-recovery-check', 'publish-promotion-check',
                                         'publish-recovery-prepare-cloud', 'publish-recovery-verify-cloud',
                                         'publish-recovery-upload-preview', 'publish-recovery-receipt-check', 'publish-cloud-promote', 'publish-project-inventory']
                                        + ['publish-' + action for action in MAINTENANCE_ACTIONS])
    parser.add_argument('--backup', type=Path)
    parser.add_argument('--repo', type=Path)
    parser.add_argument('--game', choices=['genshin', 'nte'])
    parser.add_argument('--preview', action='store_true')
    parser.add_argument('--release-key')
    parser.add_argument('--commit')
    parser.add_argument('--run')
    parser.add_argument('--pin')
    parser.add_argument('--evidence', type=Path)
    parser.add_argument('--evidence-pin')
    parser.add_argument('--retention')
    parser.add_argument('--retention-pin')
    parser.add_argument('--bundle')
    parser.add_argument('--bundle-pin')
    parser.add_argument('--journal-pin')
    parser.add_argument('--recovery')
    parser.add_argument('--recovery-pin')
    parser.add_argument('--receipt-pin')
    parser.add_argument('--baseline', type=Path)
    parser.add_argument('--baseline-pin')
    parser.add_argument('--renewal')
    parser.add_argument('--renewal-pin')
    parser.add_argument('--mode', choices=['promote', 'recover'])
    parser.add_argument('--promotion-journal-pin')
    parser.add_argument('--source', type=Path)
    parser.add_argument('--source-pin')
    supplied_flags = [arg.split('=', 1)[0] for arg in sys.argv[1:] if arg.startswith('--')]
    if len(supplied_flags) != len(set(supplied_flags)):
        parser.error('Duplicate options are forbidden')
    args = parser.parse_args()
    if args.action.removeprefix('publish-') not in MAINTENANCE_ACTIONS and any(
            getattr(args, key) is not None for key in ['baseline', 'baseline_pin', 'renewal', 'renewal_pin', 'mode', 'promotion_journal_pin', 'source', 'source_pin']):
        parser.error('Maintenance evidence options require an explicit maintenance action')
    if args.action == 'serve':
        cfg = settings()
        app = Path(cfg['app'])
        os.chdir(app)
        os.execve(NODE, [NODE, str(app / 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', '3100'], app_env(cfg))
    if args.action == 'install':
        install()
        return
    with open(ROOT / 'maintenance.lock', 'a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        cfg = settings()
        if args.action == 'resume-install':
            start('postgres')
            wait_database(cfg)
            complete_install(cfg)
        elif args.action == 'start':
            start('postgres')
            wait_database(cfg)
            start('payload')
            wait_cms()
        elif args.action == 'stop':
            stop('payload')
            stop('postgres')
        elif args.action == 'status':
            print(json.dumps({'postgresAgent': loaded('postgres'), 'cmsAgent': loaded('payload'), 'healthy': health(), 'app': cfg['app']}))
        elif args.action == 'backup':
            backup(cfg)
        elif args.action == 'restore-check':
            if not args.backup:
                parser.error('--backup is required')
            restore_check(cfg, args.backup)
        elif args.action in ['content-import', 'content-export']:
            if not args.repo or not args.game:
                parser.error('--repo and --game are required')
            command = [NODE, '--import', 'tsx', 'scripts/desktop-content.ts', args.action.removeprefix('content-'), str(args.repo.resolve()), args.game]
            if args.preview:
                command.append('--preview')
            run(command, cwd=cfg['app'], env=app_env(cfg))
        elif args.action.startswith('publish-'):
            action = args.action.removeprefix('publish-')
            command = [NODE, ROOT / 'publisher/desktop-publish.mjs', 'inspect' if action == 'plan' else action]
            if action in MAINTENANCE_ACTIONS or action == 'project-inventory':
                command += maintenance_arguments(args)
            elif action in ['plan', 'prepare']:
                if not args.repo or not args.release_key:
                    parser.error('--repo and --release-key are required')
                command += ['--repo', args.repo.resolve(), '--release-key', args.release_key]
                if args.commit:
                    command += ['--commit', args.commit]
            else:
                if not args.run or not args.pin:
                    parser.error('--run and --pin are required')
                command += ['--run', args.run, '--pin', args.pin]
                if action in ['retain', 'recovery-check', 'promotion-check', 'recovery-prepare-cloud']:
                    if not args.evidence or not args.evidence_pin:
                        parser.error('--evidence and --evidence-pin are required')
                    command += ['--evidence', args.evidence.resolve(), '--evidence-pin', args.evidence_pin]
                if action.endswith('-retained') or action in ['cloud-check', 'cloud-prepare', 'recovery-check']:
                    if not args.retention or not args.retention_pin:
                        parser.error('--retention and --retention-pin are required')
                    command += ['--retention', args.retention, '--retention-pin', args.retention_pin]
                if action in ['cloud-verify', 'cloud-upload-preview', 'cloud-reconcile', 'promotion-check', 'recovery-prepare-cloud']:
                    if not args.bundle or not args.bundle_pin:
                        parser.error('--bundle and --bundle-pin are required')
                    command += ['--bundle', args.bundle, '--bundle-pin', args.bundle_pin]
                if action in ['recovery-verify-cloud', 'recovery-upload-preview', 'recovery-receipt-check', 'cloud-promote']:
                    if not args.recovery or not args.recovery_pin:
                        parser.error('--recovery and --recovery-pin are required')
                    command += ['--recovery', args.recovery, '--recovery-pin', args.recovery_pin]
                if action in ['promotion-check', 'cloud-promote']:
                    if not args.journal_pin:
                        parser.error('--journal-pin is required')
                    command += ['--journal-pin', args.journal_pin]
                if action in ['cloud-upload-preview', 'recovery-upload-preview', 'recovery-receipt-check', 'cloud-promote']:
                    if not args.release_key:
                        parser.error('--release-key is required')
                    command += ['--release-key', args.release_key]
                if action in ['recovery-receipt-check', 'cloud-promote']:
                    if not args.receipt_pin:
                        parser.error('--receipt-pin is required')
                    command += ['--receipt-pin', args.receipt_pin]
            run(command, cwd=cfg['app'])


if __name__ == '__main__':
    main()
