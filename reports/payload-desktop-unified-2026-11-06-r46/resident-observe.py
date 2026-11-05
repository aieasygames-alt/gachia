"""Observe the installed CMS without emitting credentials or document contents."""
import datetime
import hashlib
import http.client
import importlib.util
import json
from pathlib import Path
import sys

root = Path.home() / 'Library/Application Support/GachiaCMS'
spec = importlib.util.spec_from_file_location('resident_manager', root / 'desktop.py')
manager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(manager)
cfg = manager.settings()
original_env = manager.pg_env
manager.pg_env = lambda value: {**original_env(value), 'PGOPTIONS': '-c default_transaction_read_only=on'}
sha = lambda file: hashlib.sha256(file.read_bytes()).hexdigest()
app = Path(cfg['app'])
manifest = json.loads((app.parents[1] / 'application-manifest.json').read_text())
assert all(sha(app / name) == pin for name, pin in manifest['files'].items())
assert all(sha(app.parents[1] / name) == pin for name, pin in manifest.get('releaseFiles', {}).items())
tables = json.loads(manager.sql(cfg, """SELECT json_agg(tablename ORDER BY tablename COLLATE "C")
  FROM pg_tables WHERE schemaname='public' AND tablename <> 'payload_migrations';""", 'gachia_cms'))
parts = []
for table in tables:
    relation = 'public."' + table.replace('"', '""') + '"'
    literal = "'" + table.replace("'", "''") + "'"
    parts.append(f"jsonb_build_object('table', {literal}, 'rows', (SELECT COALESCE(jsonb_agg(row ORDER BY row::text COLLATE \"C\"), '[]'::jsonb) FROM (SELECT to_jsonb(t)-'structured_value'-'version_structured_value' AS row FROM {relation} t) q))")
data = json.loads(manager.sql(cfg, 'SELECT jsonb_build_array(' + ','.join(parts) + ');', 'gachia_cms'))
projected = hashlib.sha256(json.dumps(data, sort_keys=True, separators=(',', ':'), ensure_ascii=True).encode()).hexdigest()
counts = manager.sql(cfg, 'SELECT (SELECT count(*) FROM users),(SELECT count(*) FROM content_records),(SELECT count(*) FROM media);', 'gachia_cms')
states = manager.sql(cfg, 'SELECT g.key,c._status,c.hold,count(*) FROM content_records c JOIN games g ON g.id=c.game_id GROUP BY g.key,c._status,c.hold ORDER BY g.key,c._status,c.hold;', 'gachia_cms')
checks = []
for target, headers, expected in [('/health', {}, 200), ('/admin/login', {}, 200), ('/api/users', {}, 403),
    ('/api/content-records', {}, 403), ('/api/media', {}, 403), ('/health', {'Origin': 'https://external.invalid'}, 403),
    ('/health', {'Host': 'external.invalid'}, 403), ('/health', {'Sec-Fetch-Site': 'cross-site'}, 403),
    ('/api/media/file/backup-rehearsal.png', {}, 403)]:
    conn = http.client.HTTPConnection('127.0.0.1', 3100, timeout=20)
    conn.request('GET', target, headers={'Host': '127.0.0.1:3100', **headers})
    response = conn.getresponse()
    response.read()
    checks.append({'path': target, 'status': response.status, 'passed': response.status == expected})
    conn.close()
assert all(check['passed'] for check in checks)
assert manager.health() and manager.loaded('payload') and manager.loaded('postgres')
print(json.dumps({'at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'app': str(app),
    'sourceCommit': manifest['sourceCommit'], 'applicationFilesVerified': len(manifest['files']),
    'releaseFilesVerified': len(manifest.get('releaseFiles', {})), 'counts': counts, 'states': states,
    'projectedLegacyDataSHA256': projected, 'logicalDigest': manager.logical_digest(cfg, 'gachia_cms'),
    'canonicalDataDigest': manager.canonical_data_digest(cfg, 'gachia_cms'),
    'mediaDigests': manager.file_digests(root / 'data'), 'safetyHTTP': checks,
    'managerSHA256': sha(root / 'desktop.py'), 'publisherDigests': {file.name: sha(file) for file in sorted((root / 'publisher').glob('*.mjs'))},
    'healthy': True, 'observationReadOnly': True}, indent=2))
