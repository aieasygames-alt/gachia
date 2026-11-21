"""Run the fixed installed editing sync while holding the desktop maintenance lock."""
import fcntl
import importlib.util
import hashlib
import json
from pathlib import Path
import subprocess
import sys

REPO = Path(__file__).resolve().parent.parent
REPORT = REPO / 'reports/genshin-editing-source-sync-2026-11-21-r144'
ROOT = Path.home() / 'Library/Application Support/GachiaCMS'
assert len(sys.argv) == 2 and sys.argv[1] in ['apply', 'repeat', 'verify']
action = sys.argv[1]
installed = json.loads((REPORT / 'application-installed-final.json').read_text())
preparation = json.loads((REPORT / 'preparation.json').read_text())
cfg = json.loads((ROOT / 'settings.json').read_text())
assert cfg['app'] == installed['app']
dependency_proof = installed['runtimeDependencies']
dependency_bytes = Path(dependency_proof['path']).read_bytes()
assert hashlib.sha256(dependency_bytes).hexdigest() == dependency_proof['pin']
for package in json.loads(dependency_bytes)['packages'].values():
    for name, pin in package['files'].items():
        assert hashlib.sha256((Path(package['target']) / name).read_bytes()).hexdigest() == pin
spec = importlib.util.spec_from_file_location('r144_manager', ROOT / 'desktop.py')
desktop = importlib.util.module_from_spec(spec)
spec.loader.exec_module(desktop)
receipt = REPORT / f'installed-{action}.json'
assert not receipt.exists() and not Path(str(receipt) + '.intent.json').exists(), 'Inspect any existing attempt; do not replay it'
delivery = preparation['delivery']
args = [desktop.NODE, '--import', 'tsx', 'scripts/genshin-editing-sync.ts', 'verify' if action == 'verify' else 'apply',
        '--delivery', delivery['path'], '--delivery-pin', delivery['pin'],
        '--application', installed['application']['path'], '--application-pin', installed['application']['pin'],
        '--commit', installed['sourceCommit'], '--repo', str(REPO), '--output', str(receipt), '--reviewer', '1']
env = desktop.app_env(cfg)
env.update(NODE_USE_ENV_PROXY='1', HTTPS_PROXY='http://127.0.0.1:1087', HTTP_PROXY='http://127.0.0.1:1087', NO_PROXY='127.0.0.1,localhost')
with (ROOT / 'maintenance.lock').open('a') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    with (REPORT / f'installed-{action}.log').open('x') as log:
        subprocess.run(args, cwd=installed['app'], env=env, check=True, stdout=log, stderr=log)
result = json.loads(receipt.read_text())['result']
assert result['syncKey'] == preparation['syncKey']
if action != 'verify':
    assert result['created'] == (86 if action == 'apply' else 0)
    assert result['updated'] == (390 if action == 'apply' else 0)
    assert result['reused'] == (0 if action == 'apply' else 476)
    assert result['productionDeployments'] == 0 and result['reviewWrites'] == 0
print(json.dumps({'action': action, 'result': result}, ensure_ascii=False))
