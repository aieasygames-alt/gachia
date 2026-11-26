# -*- coding: utf-8 -*-
import json,pathlib,subprocess,os,signal,time,urllib.request
r=pathlib.Path(__file__).resolve().parent;repo=r.parents[1];actual=pathlib.Path('/Users/robert/Documents/gachia')
assert json.loads((r/'probe-migration.json').read_text())['status']=='passed'
paths=['packages/data/cms/starrail-events.ts','packages/data/cms/starrail-updates.ts','packages/data/cms/starrail-publication.ts','tools/payload-cms/payload.config.ts','tools/payload-cms/payload-types.ts','tools/payload-cms/migrations/index.ts','tools/payload-cms/migrations/20261126_event_schedule.ts']
new={'packages/data/cms/starrail-events.ts','tools/payload-cms/migrations/20261126_event_schedule.ts'}
for p in paths:
 if p in new:assert not (actual/p).exists(),p+' already exists; reconcile first'
 else:assert (actual/p).read_bytes()==subprocess.check_output(['git','show','HEAD:'+p],cwd=repo),p+' differs from reviewed baseline'
for p in ['packages/data/cms/starrail-limits.ts','tools/payload-cms/scripts/publish-starrail.ts']:
 assert (actual/p).read_bytes()==subprocess.check_output(['git','show','HEAD:'+p],cwd=repo)
with urllib.request.urlopen('http://127.0.0.1:4320/api/game-updates?limit=301&depth=0&draft=false',timeout=30) as f:rows=json.load(f)
assert sorted(rows['docs'],key=lambda x:x['id'])==sorted(json.loads((r/'cms-before.json').read_text())['docs'],key=lambda x:x['id'])
pids=subprocess.check_output(['lsof','-t','-iTCP:4320','-sTCP:LISTEN'],text=True).split();assert len(pids)==1
pid=int(pids[0]);cwd=subprocess.check_output(['lsof','-a','-p',str(pid),'-d','cwd','-Fn'],text=True)
assert '\nn'+str(actual/'tools/payload-cms')+'\n' in cwd
assert 'next-server' in subprocess.check_output(['ps','-p',str(pid),'-o','command='],text=True)
(r/'editor-sync-intent.json').write_text(json.dumps({'files':paths,'oldServerPID':pid,'publicRecords':71,'onlyReviewedAdditiveMigration':True},indent=2)+'\n')
os.kill(pid,signal.SIGTERM)
for _ in range(25):
 if subprocess.run(['lsof','-t','-iTCP:4320','-sTCP:LISTEN'],capture_output=True).returncode==1:break
 time.sleep(.2)
else:raise RuntimeError('Editor did not stop; inspect before continuing')
for p in paths:(actual/p).write_bytes((repo/p).read_bytes())
old=r/'.private/editor-build-before';assert not old.exists();(actual/'tools/payload-cms/.next').rename(old)
print('Owned editor stopped; seven reviewed files synchronized; previous build preserved privately')
