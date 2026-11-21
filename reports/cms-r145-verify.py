"""Read-only verification using the new sealed application, R143 source and R144 sync evidence."""
import fcntl
import importlib.util
import json
from pathlib import Path
import subprocess

REPO = Path(__file__).resolve().parent.parent
REPORT = REPO / 'reports/cms-next-security-2026-11-21-r145'
ROOT = Path.home() / 'Library/Application Support/GachiaCMS'
installed = json.loads((REPORT / 'application-installed.json').read_text())
preparation = json.loads((REPO / 'reports/genshin-editing-source-sync-2026-11-21-r144/preparation.json').read_text())
cfg = json.loads((ROOT / 'settings.json').read_text())
assert cfg['app'] == installed['app']
spec = importlib.util.spec_from_file_location('r145_manager', ROOT / 'desktop.py')
desktop = importlib.util.module_from_spec(spec)
spec.loader.exec_module(desktop)
delivery = preparation['delivery']
receipt = REPORT / 'installed-verification.json'
assert not receipt.exists()
args = ['/opt/homebrew/Cellar/node/25.9.0_3/bin/node', '--import', 'tsx', 'scripts/genshin-editing-sync.ts', 'verify',
        '--delivery', delivery['path'], '--delivery-pin', delivery['pin'],
        '--application', installed['application']['path'], '--application-pin', installed['application']['pin'],
        '--commit', installed['sourceCommit'], '--repo', str(REPO), '--output', str(receipt), '--reviewer', '1']
env = desktop.app_env(cfg)
env.update(NODE_USE_ENV_PROXY='1', HTTPS_PROXY='http://127.0.0.1:1087', HTTP_PROXY='http://127.0.0.1:1087', NO_PROXY='127.0.0.1,localhost')
with (ROOT / 'maintenance.lock').open('a') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    log_path = REPORT / 'installed-verification.log'
    if log_path.exists():
        assert json.loads((REPORT / 'control-plane-diagnostic.json').read_text())['status'] == 401
        assert json.loads((REPORT / 'wrangler-auth-refresh.json').read_text())['exit'] == 0
        assert json.loads((REPORT / 'control-plane-after-refresh.json').read_text())['passed']
        log_path = REPORT / 'installed-verification-02.log'
    with log_path.open('x') as log:
        subprocess.run(args, cwd=installed['app'], env=env, check=True, stdout=log, stderr=log, timeout=900)
result = json.loads(receipt.read_text())
assert result['result']['verified'] and result['result']['records'] == 2966 and result['result']['contentWrites'] == 0
assert result['beforeDeployments'] == result['afterDeployments']
previous = json.loads((REPO / 'reports/genshin-editing-source-sync-2026-11-21-r144/delivery.json').read_text())
assert sorted(result['afterDeployments'], key=lambda row: row['service']) == sorted(previous['deployments'], key=lambda row: row['service'])
print(json.dumps({'verified': True, 'records': 2966, 'contentWrites': 0, 'productionDeployments': 0, 'productionServicesPreserved': 6}))
