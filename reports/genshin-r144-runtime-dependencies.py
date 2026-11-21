"""Complete the installed maintenance CLI dependency tree without changing sealed source."""
import fcntl
import hashlib
import json
from pathlib import Path
import subprocess

REPO = Path(__file__).resolve().parent.parent
REPORT = REPO / 'reports/genshin-editing-source-sync-2026-11-21-r144'
ROOT = Path.home() / 'Library/Application Support/GachiaCMS'

def inventory(folder):
    return {str(p.relative_to(folder)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(folder.rglob('*')) if p.is_file()}

def resolve_dependency(package, name):
    for directory in [package, *package.parents]:
        candidate = directory / 'node_modules' / name
        if (candidate / 'package.json').is_file():
            return candidate.resolve()
    raise RuntimeError(f'Missing required dependency: {name}')

def install_dependencies(release):
    pending = [(REPO / 'node_modules/typescript').resolve(),
               (REPO / 'node_modules/@playwright/test').resolve(),
               (REPO / 'packages/core/node_modules/zod').resolve()]
    packages = {}
    while pending:
        source = pending.pop()
        package = json.loads((source / 'package.json').read_text())
        name, version = package['name'], package['version']
        if name in packages:
            assert packages[name]['version'] == version, 'Dependency versions conflict'
            continue
        target = release / 'node_modules' / name
        files = inventory(source)
        if not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run(['/bin/cp', '-cR', str(source), str(target)], check=True)
        assert inventory(target) == files
        packages[name] = {'version': version, 'source': str(source), 'target': str(target), 'files': files}
        for dependency in package.get('dependencies', {}):
            pending.append(resolve_dependency(source, dependency))
    return packages

if __name__ == '__main__':
    with (ROOT / 'maintenance.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        installed = json.loads((REPORT / 'application-installed.json').read_text())
        app = Path(installed['app'])
        release = app.parent.parent
        assert not (REPORT / 'installed-apply.json').exists()
        assert not (REPORT / 'installed-apply.json.intent.json').exists()
        manifest = Path(installed['application']['path'])
        assert hashlib.sha256(manifest.read_bytes()).hexdigest() == installed['application']['pin']
        packages = install_dependencies(release)
        assert hashlib.sha256(manifest.read_bytes()).hexdigest() == installed['application']['pin']
        result = {'reason': 'Complete repository-level CLI dependency closure after pre-write module-resolution failure',
                  'packages': packages, 'applicationManifestUnchanged': True, 'cmsWrites': 0}
        with (REPORT / 'runtime-dependency-closure.json').open('x') as stream:
            json.dump(result, stream, indent=2)
            stream.write('\n')
        preflight = subprocess.run(['/opt/homebrew/Cellar/node/25.9.0_3/bin/node', '--import', 'tsx',
                                   '--input-type=module', '-e', "await import('./src/genshin-editing-sync.ts'); console.log('Installed sync dependency preflight passed')"],
                                  cwd=app, capture_output=True, text=True)
        with (REPORT / 'runtime-dependency-preflight-02.log').open('x') as stream:
            stream.write(preflight.stdout + preflight.stderr)
        print(json.dumps({'packages': {name: data['version'] for name, data in packages.items()},
                          'applicationManifestUnchanged': True, 'preflight': preflight.returncode}))
        assert preflight.returncode == 0, 'Inspect the preflight log before starting sync'
