# -*- coding: utf-8 -*-
"""Stop this report's local Wrangler process tree; retain the CMS listener."""
import pathlib,subprocess,os,signal,json,time
r=pathlib.Path(__file__).resolve().parent;config=str(r/'.private/local.json')
def processes():
 result={}
 for line in subprocess.check_output(['ps','-axo','pid,ppid,stat,command'],text=True).splitlines()[1:]:
  p,pp,stat,cmd=line.strip().split(None,3);result[int(p)]={'parent':int(pp),'state':stat,'command':cmd}
 return result
rows=processes();owned={p for p,v in rows.items() if config in v['command'] and 'wrangler' in v['command']}
assert owned
while True:
 expanded=owned|{p for p,v in rows.items() if v['parent'] in owned}
 if expanded==owned:break
 owned=expanded
assert os.getpid() not in owned
for p in sorted(owned,reverse=True):
 try:os.kill(p,signal.SIGTERM)
 except ProcessLookupError:pass
for _ in range(40):
 live=processes();remaining={p for p in owned if p in live and 'Z' not in live[p]['state']}
 if not remaining:break
 time.sleep(.2)
else:raise AssertionError('Owned local processes still running: '+str(remaining))
assert subprocess.run(['lsof','-t','-iTCP:4400','-sTCP:LISTEN'],capture_output=True).returncode==1
assert subprocess.run(['lsof','-t','-iTCP:4320','-sTCP:LISTEN'],capture_output=True).returncode==0
(r/'local-worker-stop.json').write_text(json.dumps({'status':'passed','entireOwnedTreeStopped':True,'pids':sorted(owned),'test4400Stopped':True,'editor4320Running':True,'unrelatedProcessesNotTargeted':True},indent=2)+'\n');print('Owned local Worker tree stopped:',sorted(owned))
