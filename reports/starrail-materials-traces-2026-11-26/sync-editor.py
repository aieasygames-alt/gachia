# -*- coding: utf-8 -*-
import pathlib,json,urllib.request,sqlite3,subprocess
repo=pathlib.Path(__file__).resolve().parents[2];r=pathlib.Path(__file__).resolve().parent;actual=pathlib.Path('/Users/robert/Documents/gachia')
paths=['packages/data/cms/starrail-materials.ts','packages/data/cms/starrail-updates.ts']
for p in paths:assert (actual/p).read_bytes()==subprocess.check_output(['git','show','HEAD:'+p],cwd=repo),p+' differs from baseline'
for p in ['packages/data/cms/starrail-limits.ts','packages/data/cms/starrail-publication.ts','tools/payload-cms/scripts/publish-starrail.ts']:assert (actual/p).read_bytes()==subprocess.check_output(['git','show','HEAD:'+p],cwd=repo),p+' capacity contract differs'
with urllib.request.urlopen('http://127.0.0.1:4320/api/game-updates?limit=301&depth=0&draft=false',timeout=30) as f:cms=json.load(f)
assert not cms['hasNextPage'] and len(cms['docs'])==55
assert sorted(cms['docs'],key=lambda x:x['slug'])==sorted(json.loads((r/'cms-before.json').read_text())['docs'],key=lambda x:x['slug'])
client=urllib.request.build_opener(urllib.request.ProxyHandler({'https':'http://127.0.0.1:1087'}))
with client.open(urllib.request.Request('https://gachia.com/api/cms/starrail?locale=zh',headers={'user-agent':'GachiaCMS/1.0'}),timeout=40) as f:cloud=json.load(f)
assert cloud==json.loads((r/'cloud-before.json').read_text())
env={l.split('=',1)[0]:l.split('=',1)[1].strip().strip('\"\'') for l in (actual/'tools/payload-cms/.env').read_text().splitlines() if '=' in l and not l.startswith('#')}
dburl=env.get('DATABASE_URL','file:./.data/payload.db');assert dburl.startswith('file:');db=pathlib.Path(dburl[5:]);db=db if db.is_absolute() else actual/'tools/payload-cms'/db
backup=r/'.private/cms-before-drafts.db';assert not backup.exists()
with sqlite3.connect('file:'+str(db)+'?mode=ro',uri=True) as src,sqlite3.connect(backup) as dst:
 src.backup(dst);assert dst.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
backup.chmod(0o600)
for p in paths:(actual/p).write_bytes((repo/p).read_bytes())
(r/'editor-sync.json').write_text(json.dumps({'status':'passed','baselineHEAD':subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip(),'files':paths,'capacityContractUnchanged':True,'backupIntegrity':'ok','publicCountBefore':55},indent=2)+'\n')
print('Exact baseline, consistent backup, two audited files synchronized')
