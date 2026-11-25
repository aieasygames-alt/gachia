import pathlib,json,urllib.request,sqlite3,subprocess,hashlib,shutil
repo=pathlib.Path(__file__).resolve().parents[2];r=pathlib.Path(__file__).resolve().parent;actual=pathlib.Path('/Users/robert/Documents/gachia')
paths=['packages/data/cms/starrail-materials.ts','packages/data/cms/starrail-updates.ts','packages/data/cms/starrail-publication.ts','packages/data/cms/starrail-client.ts','tools/payload-cms/scripts/publish-starrail.ts']
clientpath='packages/data/cms/starrail-client.ts'
for p in paths:
 original=(actual/p).read_text();head=subprocess.check_output(['git','show','HEAD:'+p],cwd=repo,text=True)
 if p==clientpath:original=original.replace("'../games/starrail/raw-updates.json'","'./starrail-snapshot.json'")
 assert original==head,p+' differs from known baseline'
assert not (actual/'packages/data/cms/starrail-limits.ts').exists()
with urllib.request.urlopen('http://127.0.0.1:4320/api/game-updates?limit=301&depth=0&draft=false',timeout=30) as f:cms=json.load(f)
assert not cms['hasNextPage'] and len(cms['docs'])==46
base=json.loads((r/'cms-before.json').read_text());assert sorted(cms['docs'],key=lambda x:x['slug'])==sorted(base['docs'],key=lambda x:x['slug'])
client=urllib.request.build_opener(urllib.request.ProxyHandler({'https':'http://127.0.0.1:1087'}))
with client.open(urllib.request.Request('https://gachia.com/api/cms/starrail?locale=zh',headers={'user-agent':'GachiaCMS/1.0'}),timeout=40) as f:cloud=json.load(f)
assert cloud==json.loads((r/'cloud-before.json').read_text())
env={l.split('=',1)[0]:l.split('=',1)[1].strip().strip('\"\'') for l in (actual/'tools/payload-cms/.env').read_text().splitlines() if '=' in l and not l.startswith('#')}
dburl=env.get('DATABASE_URL','file:./.data/payload.db');assert dburl.startswith('file:')
db=pathlib.Path(dburl[5:]);db=db if db.is_absolute() else actual/'tools/payload-cms'/db
with sqlite3.connect('file:'+str(db)+'?mode=ro',uri=True) as src,sqlite3.connect(r/'.private/cms-before-drafts.db') as dst:
 src.backup(dst);assert dst.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
for p in paths+['packages/data/cms/starrail-limits.ts']:
 text=(repo/p).read_text()
 if p==clientpath:text=text.replace("'./starrail-snapshot.json'","'../games/starrail/raw-updates.json'")
 (actual/p).write_text(text)
(r/'editor-sync.json').write_text(json.dumps({'status':'passed','baselineHEAD':subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip(),'files':paths+['packages/data/cms/starrail-limits.ts'],'preservedEditorReaderImport':'../games/starrail/raw-updates.json','backupIntegrity':'ok','publicCountBefore':46},indent=2)+'\n')
print('Baseline exact (preserved editor fallback import), SQLite backup valid, six audited files synchronized')
