import fcntl
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
REPO = Path(__file__).resolve().parent.parent
REPORT = REPO / 'reports/genshin-collection-review-2026-11-21-r142'
ROOT = Path.home() / 'Library/Application Support/GachiaCMS'
assert len(sys.argv) == 2 and sys.argv[1] in ['stage', 'stage-repeat', 'decide', 'decide-repeat', 'verify', 'verify-final', 'export', 'export-reopen', 'export-final', 'export-final-reopen']
action = sys.argv[1]
installed_file = REPORT / 'application-refresh-01/application-installed.json'
installed = json.loads((installed_file if installed_file.exists() else REPORT / 'application-installed.json').read_text())
preparation = json.loads((REPORT / 'preparation.json').read_text())
cfg = json.loads((ROOT / 'settings.json').read_text()); assert cfg['app'] == installed['app']
spec = importlib.util.spec_from_file_location('r142_manager', ROOT / 'desktop.py')
desktop = importlib.util.module_from_spec(spec); spec.loader.exec_module(desktop)
receipt = REPORT / f'installed-{action}.json'; assert not receipt.exists()
verb = action.split('-')[0]
args = [desktop.NODE, '--import', 'tsx', 'scripts/genshin-collection-review.ts', verb,
        '--input', preparation['input']['path'], '--input-pin', preparation['input']['pin'],
        '--application', installed['application']['path'], '--application-pin', installed['application']['pin'],
        '--commit', installed['sourceCommit'], '--repo', str(REPO), '--output', str(receipt)]
if verb == 'decide': args += ['--decisions', preparation['decisions']['path'], '--decisions-pin', preparation['decisions']['pin'], '--reviewer', '1']
with (ROOT / 'maintenance.lock').open('a') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    with (REPORT / f'installed-{action}.log').open('x') as log:
        subprocess.run(args, cwd=installed['app'], env=desktop.app_env(cfg), check=True, stdout=log, stderr=log)
result = json.loads(receipt.read_text())['result']
if verb == 'export':
    assert result['manifest']['runKey'] == preparation['runKey']
    assert len(result['sources']) == 115 and len(result['manifest']['decisions']) == 221
    assert result['manifest']['dependency']['complete'] is True
    print(json.dumps({'action': action, 'exportKey': result['manifest']['exportKey'], 'sources': 115, 'decisions': 221}))
else: print(json.dumps(result))
