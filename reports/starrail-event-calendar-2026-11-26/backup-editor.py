# -*- coding: utf-8 -*-
import json,pathlib,sqlite3,shutil,urllib.request
r=pathlib.Path(__file__).resolve().parent;cms=pathlib.Path('/Users/robert/Documents/gachia/tools/payload-cms')
with urllib.request.urlopen('http://127.0.0.1:4320/api/game-updates?limit=301&depth=0&draft=false',timeout=30) as f:rows=json.load(f)
assert sorted(rows['docs'],key=lambda x:x['id'])==sorted(json.loads((r/'cms-before.json').read_text())['docs'],key=lambda x:x['id'])
env={l.split('=',1)[0]:l.split('=',1)[1].strip().strip('\"\'') for l in (cms/'.env').read_text().splitlines() if '=' in l and not l.startswith('#')}
url=env.get('DATABASE_URL','file:./.data/payload.db');assert url.startswith('file:');db=pathlib.Path(url[5:]);db=db if db.is_absolute() else cms/db
backup=r/'.private/cms-before-migration.db';assert not backup.exists()
with sqlite3.connect('file:'+str(db)+'?mode=ro',uri=True) as src,sqlite3.connect(backup) as dst:
 src.backup(dst);assert dst.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
backup.chmod(0o600);shutil.copyfile(backup,r/'.private/probe.db');(r/'.private/probe.db').chmod(0o600)
(r/'backup-before.json').write_text(json.dumps({'status':'passed','consistentSQLiteBackup':True,'integrity':'ok','publicCount':71,'path':'ignored .private/cms-before-migration.db'},indent=2)+'\n')
print('Consistent private backup and isolated migration probe prepared')
