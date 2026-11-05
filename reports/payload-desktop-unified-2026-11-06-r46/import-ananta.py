"""Import one installed desktop scope after a cold backup; preserve every preexisting row."""
from collections import Counter
import datetime
import fcntl
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess

os.umask(0o077)
report = Path(__file__).resolve().parent
repo = report.parents[1]
root = Path.home() / 'Library/Application Support/GachiaCMS'
private = root / 'operations/unified-r46-import-ananta'
private.mkdir(parents=True, mode=0o700)
spec = importlib.util.spec_from_file_location('r46_import_manager', root / 'desktop.py')
manager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(manager)
cfg = manager.settings()
installation = json.loads((report / 'installation.json').read_text())
assert installation['status'] == 'installed_and_healthy' and installation['app'] == cfg['app']
plan_pin = '03ad336434e125bad1cbe56ab17319227c9e5e344bfe6344dc29e30451c5cb0d'

def save(file, value):
    with file.open('x') as stream:
        json.dump(value, stream, indent=2)
        stream.write('\n')

def snapshot():
    tables = json.loads(manager.sql(cfg, "SELECT json_agg(tablename ORDER BY tablename COLLATE \"C\") FROM pg_tables WHERE schemaname='public';", 'gachia_cms'))
    result = {}
    for table in tables:
        relation = 'public."' + table.replace('"', '""') + '"'
        result[table] = json.loads(manager.sql(cfg, f"SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) FROM {relation} t;", 'gachia_cms'))
    return result

with (root / 'maintenance.lock').open('a') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    assert manager.health()
    assert manager.sql(cfg, 'SELECT (SELECT count(*) FROM users),(SELECT count(*) FROM content_records),(SELECT count(*) FROM media);', 'gachia_cms') == '1|85|1'
    before = snapshot()
    save(private / 'database-rows-before.json', before)
    media = manager.file_digests(root / 'data')
    backup = manager.backup(cfg)
    assert snapshot() == before

with (report / 'import-ananta.log').open('x') as log:
    subprocess.run(['python3', str(root / 'desktop.py'), 'unified-import', '--repo', str(repo), '--pin', plan_pin, '--scope', 'ananta'],
        cwd=repo, stdout=log, stderr=subprocess.STDOUT, check=True, timeout=120)

with (root / 'maintenance.lock').open('a') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    after = snapshot()
    assert set(after) == set(before)
    canonical = lambda row: json.dumps(row, sort_keys=True, separators=(',', ':'))
    additions = {}
    for table, rows in before.items():
        old, new = Counter(map(canonical, rows)), Counter(map(canonical, after[table]))
        assert not old - new, f'Preexisting row changed or removed: {table}'
        added = new - old
        if added:
            assert table == 'games' or table.startswith(('games_', 'content_records', '_content_records_v')), table
            additions[table] = sum(added.values())
    records = after['content_records']
    new_records = [row for row in records if row['stable_key'].startswith('unified:ananta:')]
    assert len(records) == 150 and len(new_records) == 65
    assert all(row['_status'] == 'draft' and row['hold'] is True and row['structured_value'] is not None for row in new_records)
    assert manager.file_digests(root / 'data') == media and manager.health()
    save(private / 'database-rows-after.json', after)
    result = {'at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'status': 'scope_imported_held_not_activated',
        'scope': 'ananta', 'planPin': plan_pin, 'createdHeldDrafts': 65, 'contentRecords': 150,
        'preexistingRowsAndVersionsPreserved': True, 'additionsByTable': additions, 'mediaUnchanged': True,
        'coldBackup': str(backup), 'privateSnapshots': str(private), 'cloudWrites': False, 'websiteChanged': False,
        'canonicalDataDigest': manager.canonical_data_digest(cfg, 'gachia_cms')}
    save(report / 'import-ananta.json', result)
print(json.dumps(result, indent=2))
