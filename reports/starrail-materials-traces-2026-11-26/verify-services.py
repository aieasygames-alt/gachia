# -*- coding: utf-8 -*-
"""Verify the local published export and save a consistent private backup."""
import datetime,json,pathlib,sqlite3,subprocess,urllib.request

root=pathlib.Path(__file__).resolve().parent
cms=pathlib.Path('/Users/robert/Documents/gachia/tools/payload-cms')
with urllib.request.urlopen('http://127.0.0.1:4320/api/game-updates?limit=301&depth=0&draft=false',timeout=30) as response:
    public=json.load(response)
assert not public['hasNextPage'] and len(public['docs'])==71
assert sorted(public['docs'],key=lambda row:row['slug'])==sorted(json.loads((root/'cms-after.json').read_text())['docs'],key=lambda row:row['slug'])
env={line.split('=',1)[0]:line.split('=',1)[1].strip().strip('\"\'') for line in (cms/'.env').read_text().splitlines() if '=' in line and not line.startswith('#')}
url=env.get('DATABASE_URL','file:./.data/payload.db')
assert url.startswith('file:')
db=pathlib.Path(url[5:]);db=db if db.is_absolute() else cms/db
backup=root/'.private/cms-after-publication.db'
assert not backup.exists(),'Preserve the existing backup and reconcile rather than overwrite.'
with sqlite3.connect('file:'+str(db)+'?mode=ro',uri=True) as source,sqlite3.connect(backup) as target:
    source.backup(target)
    assert target.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
backup.chmod(0o600)
def listener(port):
    result=subprocess.run(['lsof','-nP','-iTCP:'+port,'-sTCP:LISTEN'],capture_output=True,text=True)
    assert result.returncode in (0,1)
    return result.stdout.strip()
ports={port:listener(port) for port in ['4320','4398','4399','4400']}
before=json.loads((root/'local-services-before.json').read_text())
assert ports['4320'] and not ports['4400']
assert all(ports[port]==before[port]=='' for port in ['4398','4399']),'An unrelated service changed; inspect without stopping it.'
receipt={'capturedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'cms4320Running':True,'publicPublishedCount':71,'exportMatchesPayloadPublication':True,'local4400Stopped':True,'unrelated4398And4399Preserved':True,'listeners':ports,'backupAfterPublicationIntegrity':'ok','backupFile':'ignored .private/cms-after-publication.db'}
with (root/'local-services.json').open('x') as output:
    json.dump(receipt,output,indent=2);output.write('\n')
print('Local export: 71 records; consistent backup: ok; service state: verified')
