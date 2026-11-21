from pathlib import Path
import os, subprocess, hashlib, json
repo=Path(__file__).resolve().parent.parent
report=repo/'reports/genshin-collection-review-2026-11-21-r142'
items=[]
for folder,dirs,files in os.walk(repo/'reports'):
 dirs[:]=[d for d in dirs if d not in ['node_modules','.git','.next','.open-next','genshin-collection-review-2026-11-21-r142']]
 for name in files:
  p=Path(folder)/name
  if p.is_symlink() or p.suffix not in ['.json','.body','.js','.mjs','.log','.multipart','.html']:continue
  s=p.stat()
  if s.st_size>=512*1024 and s.st_blocks*512>s.st_size*.7:items.append(p)
free=lambda: os.statvfs(repo).f_bavail*os.statvfs(repo).f_frsize/2**30
before=free(); (report/'compression-intent.json').write_text(json.dumps({'operation':'Transparent APFS compression; preserve every path, byte digest, mode and timestamp','paths':[str(p) for p in items],'freeBeforeGiB':before},indent=2)+'\n')
results=[]
for p in items:
 a=p.stat(); pin=hashlib.sha256(p.read_bytes()).hexdigest(); t=p.with_name(p.name+'.r142-compressed-tmp');assert not t.exists()
 subprocess.run(['/usr/bin/ditto','--hfsCompression',str(p),str(t)],check=True,stdout=subprocess.DEVNULL)
 b=t.stat();assert hashlib.sha256(t.read_bytes()).hexdigest()==pin
 if b.st_blocks<a.st_blocks:
  os.chmod(t,a.st_mode);os.utime(t,ns=(a.st_atime_ns,a.st_mtime_ns));t.replace(p)
  results.append({'path':str(p),'pin':pin,'logicalBytes':a.st_size,'beforeAllocated':a.st_blocks*512,'afterAllocated':b.st_blocks*512})
 else:t.unlink()
value={'files':len(results),'freeBeforeGiB':before,'freeAfterGiB':free(),'fileBytesAndPathsPreserved':True,'results':results}
(report/'compression-result.json').write_text(json.dumps(value,indent=2)+'\n');print(json.dumps({k:v for k,v in value.items() if k!='results'}))
