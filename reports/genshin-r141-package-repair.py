"""Add the missing ESM package boundary; preserve the first installed manifest."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import subprocess

REPO = Path(__file__).resolve().parent.parent
REPORT = REPO / 'reports/genshin-structural-intake-2026-11-20-r141'
ROOT = Path.home() / 'Library/Application Support/GachiaCMS'
sha = lambda file: hashlib.sha256(Path(file).read_bytes()).hexdigest()

def save(file, data):
    with Path(file).open('x') as stream:
        os.chmod(file, 0o600)
        stream.write(json.dumps(data, indent=2) + '\n')

with (ROOT / 'maintenance.lock').open('a') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    installed = json.loads((REPORT / 'application-installed.json').read_text())
    assert not (REPORT / 'installed-apply.json.intent.json').exists(), 'Inspect any earlier database intent first'
    assert json.loads((ROOT / 'settings.json').read_text())['app'] == installed['app']
    file = Path(installed['application']['path']); assert sha(file) == installed['application']['pin']
    manifest = json.loads(file.read_text()); app = Path(installed['app']); release = app.parent.parent
    for name, pin in manifest['files'].items(): assert sha(app / name) == pin
    for name, pin in manifest['releaseFiles'].items(): assert sha(release / name) == pin
    save(REPORT / 'application-manifest-initial.json', manifest)
    relative = 'packages/data/package.json'; destination = release / relative
    assert not destination.exists()
    source = subprocess.run(['git', 'show', installed['sourceCommit'] + ':' + relative], cwd=REPO, check=True, capture_output=True).stdout
    assert json.loads(source)['type'] == 'module'
    destination.write_bytes(source)
    manifest['releaseFiles'][relative] = sha(destination)
    pending = file.with_name('application-manifest.r141-pending.json'); save(pending, manifest); pending.replace(file)
    save(REPORT / 'application-installed-02.json', {**installed, 'application': {'path': str(file), 'pin': sha(file)},
        'releaseFiles': len(manifest['releaseFiles']), 'previousManifest': {'path': str(REPORT / 'application-manifest-initial.json'), 'pin': sha(REPORT / 'application-manifest-initial.json')},
        'packagingRepair': {'file': relative, 'pin': sha(destination), 'reason': 'ESM boundary required for named TypeScript exports',
          'databaseOpenedByFailedAttempt': False, 'sourceCodeOrBuildChanged': False}})
print(json.dumps({'packageBoundaryRestored': True, 'databaseWrites': 0, 'sourceCommit': installed['sourceCommit']}))
