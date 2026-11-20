import fcntl
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys

REPO = Path(__file__).resolve().parent.parent
REPORT = REPO / 'reports/genshin-structural-intake-2026-11-20-r141'
ROOT = Path.home() / 'Library/Application Support/GachiaCMS'
assert len(sys.argv) == 2 and sys.argv[1] in ['apply', 'apply-02', 'verify', 'repeat']
action = sys.argv[1]
installed_file = REPORT / 'application-installed-02.json'
installed = json.loads((installed_file if installed_file.exists() else REPORT / 'application-installed.json').read_text())
preparation = json.loads((REPORT / 'preparation.json').read_text())
cfg = json.loads((ROOT / 'settings.json').read_text())
assert cfg['app'] == installed['app']
spec = importlib.util.spec_from_file_location('r141_manager', ROOT / 'desktop.py')
desktop = importlib.util.module_from_spec(spec); spec.loader.exec_module(desktop)
receipt = REPORT / f'installed-{action}.json'
assert not receipt.exists()
args = [desktop.NODE, '--import', 'tsx', 'scripts/genshin-structural-stage.ts', 'verify' if action == 'verify' else 'apply',
        '--input', preparation['input']['path'], '--input-pin', preparation['input']['pin'],
        '--application', installed['application']['path'], '--application-pin', installed['application']['pin'],
        '--commit', installed['sourceCommit'], '--repo', str(REPO), '--output', str(receipt)]
with (ROOT / 'maintenance.lock').open('a') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    with (REPORT / f'installed-{action}.log').open('x') as log:
        subprocess.run(args, cwd=installed['app'], env=desktop.app_env(cfg), check=True, stdout=log, stderr=log)
result = json.loads(receipt.read_text())
assert result['records'] == 179 and result['held'] is True and result['publishable'] is False
if action != 'verify':
    assert result['contentRecordWrites'] == 0 and result['alreadyAppliedSkipped'] == 42
    assert result['created'] == (0 if action == 'repeat' else 179)
    assert result['reused'] == (179 if action == 'repeat' else 0)
print(json.dumps({k: result[k] for k in ['stageKey', 'records', 'held', 'publishable']}, ensure_ascii=False))
