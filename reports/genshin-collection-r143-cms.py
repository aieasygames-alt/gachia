# Read-only re-export through the verified installed CMS under its maintenance lock.
import fcntl, importlib.util, json, subprocess, sys
from pathlib import Path
REPO = Path(__file__).resolve().parent.parent
ROOT = Path.home() / 'Library/Application Support/GachiaCMS'
REPORT = REPO / 'reports/genshin-collection-production-2026-11-21-r143'
old = REPO / 'reports/genshin-collection-review-2026-11-21-r142'
installed = json.loads((old / 'application-form-02/application-installed.json').read_text())
preparation = json.loads((old / 'preparation.json').read_text())
cfg = json.loads((ROOT / 'settings.json').read_text()); assert cfg['app'] == installed['app']
spec = importlib.util.spec_from_file_location('r143_manager', ROOT / 'desktop.py')
desktop = importlib.util.module_from_spec(spec); spec.loader.exec_module(desktop)
assert len(sys.argv) == 2 and sys.argv[1] in ['qualification', 'before-preview', 'before-promote', 'after-production']
receipt = REPORT / f'cms-{sys.argv[1]}.json'; assert not receipt.exists()
args = [desktop.NODE, '--import', 'tsx', 'scripts/genshin-collection-review.ts', 'export',
 '--input', preparation['input']['path'], '--input-pin', preparation['input']['pin'],
 '--application', installed['application']['path'], '--application-pin', installed['application']['pin'],
 '--commit', installed['sourceCommit'], '--repo', str(REPO), '--output', str(receipt)]
with (ROOT / 'maintenance.lock').open('a') as lock:
 fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
 with (REPORT / f'cms-{sys.argv[1]}.log').open('x') as log:
  subprocess.run(args, cwd=installed['app'], env=desktop.app_env(cfg), check=True, stdout=log, stderr=log)
result = json.loads(receipt.read_text())['result']
assert len(result['sources']) == 115 and len(result['manifest']['decisions']) == 221
print(json.dumps({'readOnly': True, 'exportKey': result['manifest']['exportKey'], 'decisions': 221}))
