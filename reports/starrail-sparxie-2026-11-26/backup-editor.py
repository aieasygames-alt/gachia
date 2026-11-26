"""Read-only export check and consistent private SQLite backup."""
import json
import pathlib
import sqlite3
import subprocess
import sys
import urllib.request

root = pathlib.Path(__file__).resolve().parent
phase = sys.argv[1]
assert phase in ['before', 'after']
cms = pathlib.Path('/Users/robert/Documents/gachia/tools/payload-cms')
with urllib.request.urlopen('http://127.0.0.1:4320/api/game-updates?limit=301&depth=0&draft=false', timeout=30) as response:
    public = json.load(response)
expected = json.loads((root / ('cms-' + phase + '.json')).read_text())
assert not public['hasNextPage']
order = lambda rows: sorted(rows, key=lambda row: row['slug'])
assert order(public['docs']) == order(expected['docs'])
env = {line.split('=', 1)[0]: line.split('=', 1)[1].strip().strip('"\'') for line in (cms / '.env').read_text().splitlines() if '=' in line and not line.startswith('#')}
url = env.get('DATABASE_URL', 'file:./.data/payload.db')
assert url.startswith('file:')
db = pathlib.Path(url[5:])
db = db if db.is_absolute() else cms / db
backup = root / ('.private/cms-' + phase + '.db')
assert not backup.exists()
with sqlite3.connect('file:' + str(db) + '?mode=ro', uri=True) as source, sqlite3.connect(backup) as target:
    source.backup(target)
    assert target.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
backup.chmod(0o600)
ports = {p: subprocess.run(['lsof', '-nP', '-iTCP:' + p, '-sTCP:LISTEN'], capture_output=True, text=True).stdout.strip() for p in ['4320', '4398', '4399', '4400']}
before_ports = json.loads((root / 'local-services-before.json').read_text())
if phase == 'before':
    assert ports == before_ports
else:
    assert ports['4320'] and not ports['4400']
    assert all(ports[p] == before_ports[p] for p in ['4398', '4399'])
with (root / ('backup-' + phase + '.json')).open('x') as output:
    json.dump(dict(status='passed', records=len(public['docs']), consistentSQLiteBackup=True, integrity='ok', privateBackupMode='0600', unrelatedListenersUnchanged=True, editorRunning=True), output, indent=2)
    output.write('\n')
print('Local export matches; consistent backup and listener state verified:', phase)
