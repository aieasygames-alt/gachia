"""Build an exact-CI application without contacting the desktop database."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess

os.umask(0o077)
report = Path(__file__).resolve().parent
repo = report.parents[1]
root = Path.home() / 'Library/Application Support/GachiaCMS'
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo, text=True).strip()
ci = json.loads((report / 'github-code-result.json').read_text())
assert ci['headSha'] == head and ci['conclusion'] == 'success' and ci['status'] == 'completed'
assert not subprocess.check_output(['git', 'status', '--porcelain', '-uno'], cwd=repo, text=True).strip()
assert shutil.disk_usage(root).free > 12 * 1024**3
cfg = json.loads((root / 'settings.json').read_text())
old = Path(cfg['app'])
release = root / 'releases' / (datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-unified-' + head[:8])
release.mkdir(mode=0o700)
app = release / 'services/content-cms'
app.mkdir(parents=True)
paths = subprocess.check_output(['git', 'ls-files', 'services/content-cms', 'packages/core', 'scripts',
    'packages/data/scripts/generate-character-summaries.mjs'], cwd=repo, text=True).splitlines()
source_count = 0
for name in paths:
    parts = Path(name).parts
    include = name.startswith('packages/core/') or name == 'packages/data/scripts/generate-character-summaries.mjs'
    include |= name.startswith('scripts/') and len(parts) == 2 and (name.endswith('.mjs') or name.endswith('.py'))
    include |= name.startswith('services/content-cms/') and (parts[2] in ['src', 'scripts']
        or parts[-1] in ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'next.config.mjs', 'tsconfig.json', 'tsconfig.editor.json'])
    if not include:
        continue
    expected = subprocess.check_output(['git', 'show', f'{head}:{name}'], cwd=repo)
    assert (repo / name).read_bytes() == expected, name
    target = release / name
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open('xb') as stream:
        stream.write(expected)
    source_count += 1
assert (app / 'pnpm-lock.yaml').read_bytes() == (old / 'pnpm-lock.yaml').read_bytes()
subprocess.run(['/bin/cp', '-cR', str(old / 'node_modules'), str(app / 'node_modules')], check=True)
for file in (app / 'node_modules').rglob('*'):
    if file.is_symlink():
        assert file.resolve().is_relative_to(app / 'node_modules'), str(file)
env = {key: value for key, value in os.environ.items() if not key.startswith(('CMS_', 'PAYLOAD_'))
    and key not in ['DATABASE_URL', 'CI', 'GITHUB_ACTIONS', 'D1_DATABASE_ID', 'R2_BUCKET']}
env.update(CMS_MODE='postgres-local', CMS_LOCAL_ONLY='1', CMS_LOCAL_NAMESPACE='pg-probe-r46-build',
    CMS_SERVER_URL='http://127.0.0.1:3199', CMS_PG_SCHEMA_PUSH='0',
    DATABASE_URL='postgres://unused:' + secrets.token_hex(32) + '@127.0.0.1:1/cms_probe_build_r46',
    PAYLOAD_SECRET=secrets.token_hex(48), CMS_EDITOR_BUILD='1', NEXT_TELEMETRY_DISABLED='1', NODE_ENV='production')
with (report / 'staged-build.log').open('x') as log:
    subprocess.run(['/opt/homebrew/bin/node', str(app / 'node_modules/next/dist/bin/next'), 'build'], cwd=app,
        env=env, stdout=log, stderr=subprocess.STDOUT, check=True, timeout=240)
sha = lambda file: hashlib.sha256(file.read_bytes()).hexdigest()
files = {}
for tree in ['src', 'scripts', '.next']:
    for file in sorted((app / tree).rglob('*')):
        if file.is_file() and 'cache' not in file.relative_to(app).parts and 'dev' not in file.relative_to(app).parts:
            files[file.relative_to(app).as_posix()] = sha(file)
for name in ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'next.config.mjs', 'tsconfig.json', 'tsconfig.editor.json']:
    files[name] = sha(app / name)
extra = {name: sha(release / name) for name in paths if (release / name).is_file() and not name.startswith('services/content-cms/')}
manifest = {'schemaVersion': 1, 'sourceCommit': head, 'app': str(app), 'previousApp': str(old),
    'buildID': (app / '.next/BUILD_ID').read_text().strip(), 'files': files, 'releaseFiles': extra,
    'productionSwitched': False, 'databaseMigrationRequired': True}
manifest_path = release / 'application-manifest.json'
with manifest_path.open('x') as stream:
    json.dump(manifest, stream, indent=2)
    stream.write('\n')
result = {key: value for key, value in manifest.items() if key not in ['files', 'releaseFiles']}
result.update(manifestPath=str(manifest_path), manifestSHA256=sha(manifest_path), sourceFilesVerified=source_count,
    applicationFilesVerified=len(files), releaseFilesVerified=len(extra), onlineDatabaseContacted=False)
with (report / 'staged-app.json').open('x') as stream:
    json.dump(result, stream, indent=2)
    stream.write('\n')
print(json.dumps(result, indent=2))
