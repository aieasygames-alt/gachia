"""Remove only regenerated dependency/build caches after R148 source advancement."""
from pathlib import Path
import json, shutil, subprocess, datetime
repo = Path(__file__).resolve().parents[2]
report = Path(__file__).resolve().parent
assert (report / 'source-result.json').is_file(), 'Publish/reopen source before cache cleanup'
settings = json.loads((Path.home() / 'Library/Application Support/GachiaCMS/settings.json').read_text())
assert Path(settings['app']).resolve() != (repo / 'services/content-cms').resolve()
workspace = report / 'frozen/source'
paths = [workspace / 'node_modules']
paths += sorted((workspace / 'apps').glob('*/node_modules'))
paths += sorted((workspace / 'packages').glob('*/node_modules'))
paths += [repo / 'services/content-cms/.next/cache', report / '__pycache__']
before = shutil.disk_usage(repo).free
removed = []
for p in paths:
 assert p.is_relative_to(repo)
 assert not subprocess.check_output(['git','ls-files','--',str(p.relative_to(repo))], cwd=repo).strip()
 if p.is_symlink():
  p.unlink(); removed.append(str(p))
 elif p.exists():
  assert p.is_dir() and p.resolve().is_relative_to(repo); shutil.rmtree(p); removed.append(str(p))
after = shutil.disk_usage(repo).free
assert after >= 8 * 2**30
(report / 'cleanup.json').write_text(json.dumps({
 'at':datetime.datetime.now(datetime.timezone.utc).isoformat(), 'removedGeneratedCaches':removed,
 'preserved':['frozen source files and proofs','all built validation artifacts','sealed candidate and recovery','cloud/local/public response evidence','published source artifacts','R147 resident CMS installation and backups','user proxy'],
 'freeBeforeGiB':round(before/2**30,2),'freeAfterGiB':round(after/2**30,2), 'reserveGiB':8,
 'fullGameBuildMinimumGiB':14,'cmsBuildMinimumGiB':10,'contentOrWorkerWrites':0
},indent=2)+'\n')
print(json.dumps({'removedCacheDirectories':len(removed),'freeGiB':round(after/2**30,2)}))
