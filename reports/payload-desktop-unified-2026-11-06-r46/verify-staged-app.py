"""Restore a live read-only dump into an owned cluster and verify the staged upgrade."""
import datetime
import hashlib
import http.client
import importlib.util
import json
import os
from pathlib import Path
import secrets
import shutil
import socket
import subprocess
import tempfile
import time

os.umask(0o077)
report = Path(__file__).resolve().parent
repo = report.parents[1]
root = Path.home() / 'Library/Application Support/GachiaCMS'
staged = json.loads((report / 'staged-app.json').read_text())
app = Path(staged['app'])
sha = lambda file: hashlib.sha256(file.read_bytes()).hexdigest()
assert sha(Path(staged['manifestPath'])) == staged['manifestSHA256']
manifest = json.loads(Path(staged['manifestPath']).read_text())
assert all(sha(app / name) == pin for name, pin in manifest['files'].items())
assert all(sha(app.parents[1] / name) == pin for name, pin in manifest['releaseFiles'].items())
spec = importlib.util.spec_from_file_location('probe_manager', root / 'desktop.py')
manager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(manager)
cfg = manager.settings()
assert cfg['app'] == staged['previousApp'] and manager.health()
before = json.loads((report / 'resident-before.json').read_text())
assert manager.canonical_data_digest(cfg, 'gachia_cms') == before['canonicalDataDigest']
pg, node = manager.PG, manager.NODE
temporary = Path(tempfile.mkdtemp(prefix='r46-upgrade-probe-'))
os.chmod(temporary, 0o700)
password, secret = secrets.token_hex(32), secrets.token_hex(48)
database = 'gachia_cms'
logs, server, started = [], None, False
result = {'at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'sourceCommit': staged['sourceCommit'],
    'app': str(app), 'passed': False, 'liveDatabaseWrites': False, 'liveReadOnlyDump': True, 'cmsMode': 'desktop'}

def port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]

pg_port, http_port = port(), port()
assert pg_port not in [3100, 54329] and http_port not in [3100, 54329, pg_port]
env = {key: value for key, value in os.environ.items() if not key.startswith(('CMS_', 'PAYLOAD_'))
    and key not in ['DATABASE_URL', 'D1_DATABASE_ID', 'R2_BUCKET', 'CI', 'GITHUB_ACTIONS']}
env.update(CMS_MODE='desktop', CMS_DATA_DIR=str(temporary / 'media'),
    CMS_SERVER_URL='http://127.0.0.1:3100', PAYLOAD_SECRET=secret,
    DATABASE_URL=f'postgres://cms_app:{password}@127.0.0.1:{pg_port}/{database}', NODE_ENV='production', NEXT_TELEMETRY_DISABLED='1',
    PGHOST='127.0.0.1', PGPORT=str(pg_port), PGUSER='probe', PGPASSWORD=password, PGDATABASE='postgres')

def run(args, log_output=True, **kwargs):
    done = subprocess.run([str(arg) for arg in args], cwd=app, env=env, text=True, capture_output=True, timeout=180, **kwargs)
    if log_output:
        logs.append(done.stdout)
    logs.append(done.stderr)
    if done.returncode:
        raise RuntimeError(f'{Path(str(args[0])).name} failed; see redacted staged-runtime-desktop.log')
    return done.stdout

def sql(statement):
    return run([pg / 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-At', '-d', database], input=statement, log_output=False).strip()

def legacy_rows():
    tables = json.loads(sql("SELECT json_agg(tablename ORDER BY tablename COLLATE \"C\") FROM pg_tables WHERE schemaname='public' AND tablename <> 'payload_migrations';"))
    parts = []
    for table in tables:
        relation = 'public."' + table.replace('"', '""') + '"'
        literal = "'" + table.replace("'", "''") + "'"
        parts.append(f"jsonb_build_object('table',{literal},'rows',(SELECT COALESCE(jsonb_agg(row ORDER BY row::text COLLATE \"C\"),'[]'::jsonb) FROM (SELECT to_jsonb(t)-'structured_value'-'version_structured_value' AS row FROM {relation} t) q))")
    data = json.loads(sql('SELECT jsonb_build_array(' + ','.join(parts) + ');'))
    return hashlib.sha256(json.dumps(data, sort_keys=True, separators=(',', ':'), ensure_ascii=True).encode()).hexdigest()

try:
    dump = temporary / 'resident.dump'
    subprocess.run([str(pg / 'pg_dump'), '-Fc', '--no-owner', '--no-privileges', '-d', 'gachia_cms', '-f', str(dump)],
        env={**manager.pg_env(cfg), 'PGOPTIONS': '-c default_transaction_read_only=on'}, check=True, capture_output=True)
    assert manager.canonical_data_digest(cfg, 'gachia_cms') == before['canonicalDataDigest']
    pwfile = temporary / 'password'
    pwfile.write_text(password + '\n')
    run([pg / 'initdb', '-D', temporary / 'db', '-U', 'probe', '--auth=scram-sha-256', '--encoding=UTF8', '--locale=C', f'--pwfile={pwfile}'])
    pwfile.unlink()
    run([pg / 'pg_ctl', '-D', temporary / 'db', '-l', temporary / 'postgres.log', '-o', f'-h 127.0.0.1 -p {pg_port} -k {temporary}', '-w', 'start'])
    started = True
    run([pg / 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-At'],
        input=f"CREATE ROLE cms_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '{password}'; CREATE DATABASE {database} OWNER cms_app;")
    run([pg / 'pg_restore', '--no-owner', '--no-privileges', '--role', 'cms_app', '-d', database, dump])
    assert legacy_rows() == before['projectedLegacyDataSHA256']
    assert sql('SELECT (SELECT count(*) FROM users),(SELECT count(*) FROM content_records),(SELECT count(*) FROM media);') == '1|85|1'
    run([node, app / 'node_modules/payload/bin.js', 'migrate'])
    run([node, app / 'node_modules/payload/bin.js', 'migrate'])
    assert legacy_rows() == before['projectedLegacyDataSHA256']
    assert sql("SELECT count(*) FROM information_schema.columns WHERE (table_name='content_records' AND column_name='structured_value') OR (table_name='_content_records_v' AND column_name='version_structured_value');") == '2'
    result['legacyRowsAndVersionsPreserved'] = True
    result['repeatedMigrationIdempotent'] = True
    result['countsAfterMigration'] = '1|85|1'
    with (temporary / 'next.log').open('w') as log:
        server = subprocess.Popen([node, str(app / 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', str(http_port)],
            cwd=app, env=env, stdout=log, stderr=log)
        ready = False
        for _ in range(90):
            assert server.poll() is None, 'Staged server exited'
            try:
                conn = http.client.HTTPConnection('127.0.0.1', http_port, timeout=2)
                conn.request('GET', '/health', headers={'Host': '127.0.0.1:3100'})
                response = conn.getresponse()
                ready = response.status == 200
                response.read()
                conn.close()
            except OSError:
                pass
            if ready:
                break
            time.sleep(0.5)
        assert ready
        checks = []
        for target, headers, expected in [('/health', {}, 200), ('/admin/login', {}, 200), ('/api/users', {}, 403),
            ('/api/content-records', {}, 403), ('/api/media', {}, 403), ('/health', {'Origin': 'https://external.invalid'}, 403),
            ('/health', {'Host': 'external.invalid'}, 403), ('/health', {'Sec-Fetch-Site': 'cross-site'}, 403)]:
            conn = http.client.HTTPConnection('127.0.0.1', http_port, timeout=20)
            conn.request('GET', target, headers={'Host': '127.0.0.1:3100', **headers})
            response = conn.getresponse()
            response.read()
            checks.append({'path': target, 'status': response.status, 'passed': response.status == expected})
            conn.close()
        result['safetyHTTP'] = checks
        assert all(check['passed'] for check in checks)
        assert legacy_rows() == before['projectedLegacyDataSHA256']
    result['passed'] = True
finally:
    if server and server.poll() is None:
        server.terminate()
        try:
            server.wait(timeout=10)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait(timeout=10)
    if started:
        run([pg / 'pg_ctl', '-D', temporary / 'db', '-m', 'fast', '-w', 'stop'])
    for file in [temporary / 'next.log', temporary / 'postgres.log']:
        if file.exists():
            logs.append(file.read_text())
    with (report / 'staged-runtime-desktop.log').open('x') as stream:
        stream.write('\n'.join(logs).replace(password, '[REDACTED]').replace(secret, '[REDACTED]'))
    shutil.rmtree(temporary)
    result['temporaryServicesStopped'] = True
    result['privateDumpRemoved'] = True
    assert manager.canonical_data_digest(cfg, 'gachia_cms') == before['canonicalDataDigest']
    with (report / 'staged-runtime-desktop.json').open('x') as stream:
        json.dump(result, stream, indent=2)
        stream.write('\n')
print(json.dumps(result, indent=2))
assert result['passed']
