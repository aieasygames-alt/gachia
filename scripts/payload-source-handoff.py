"""Create, verify and safely extract a credential-free source snapshot, not a CMS backup."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import subprocess
import tempfile
import zipfile

ROOTS = ('apps', 'packages', 'scripts', 'services/content-cms', 'patches', 'docs', 'plans',
         '.github', 'content', 'public', 'tests')
SKIP = {'.git', 'node_modules', '.local', '.next', '.open-next', '.wrangler', '.turbo',
        '__pycache__', '.release-records', '.gachia-workbench', 'coverage', 'test-results', 'playwright-report'}
PRIVATE = {'settings.json', 'initial-admin.txt', 'worker.multipart', '.DS_Store'}
SUFFIXES = ('.db', '.sqlite', '.sqlite3', '.dump', '.pem', '.key', '.gcm', '.p12', '.zip',
            '.tar', '.gz', '.log', '.tsbuildinfo', '.backup', '.bak', '.pyc')
EVIDENCE = {
    'reports/payload-migration-2026-10-28/inventory.json',
    'reports/payload-migration-2026-10-28/record-plan-v2.json',
    'reports/owner-media-manifest-2026-10-31.json',
    'reports/owner-media-runtime-audit-2026-10-31.json',
    'reports/payload-status-audit-2026-10-30/batch17-shadow.json',
    'reports/shadow-fixture-2026-10-31.json',
    'reports/payload-next-phase-2026-11-01/shadow-split-fixture.json',
    'reports/content-integrity/s2-12-source-decisions-2026-10-24.json',
    'reports/content-integrity/archive/s2-14/characters.json',
    'reports/content-integrity/archive/s2-14/guides.json',
    'reports/content-integrity/archive/s2-14/ledger.json',
    'reports/content-integrity/archive/s2-14/images/meewee.webp',
    'reports/content-integrity/archive/s2-14/images/sparka.webp',
    'reports/content-integrity/archive/s2-14/images/cerulla.webp',
    'reports/payload-nte-cloud-protocol-2026-11-02/README.md',
    'reports/payload-nte-cloud-protocol-2026-11-02/assets.json',
    'reports/payload-nte-cloud-protocol-2026-11-02/cloud-final-check.json',
    'reports/payload-nte-cloud-protocol-2026-11-02/source-install-integrity.json',
    'reports/payload-continuous-rehearsal-2026-11-02/README.md',
    'reports/payload-operations-handoff-2026-11-02/dependency-audit.json',
    'reports/payload-operations-handoff-2026-11-02/dependency-review.json',
}
SECRET_PATTERNS = [
    rb'-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----',
    rb'\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b',
    rb'\b(?:sk-proj-|sk-live-|sk_live_)[A-Za-z0-9_-]{20,}',
    rb'(?i)oauth_token\s*=\s*[\"\'][A-Za-z0-9_-]{20,}',
    rb'(?i)Bearer\s+[A-Za-z0-9_-]{32,}(?:\.[A-Za-z0-9_-]+){0,2}',
]
MAX_FILE, MAX_TOTAL, MAX_FILES = 64 * 1024 * 1024, 512 * 1024 * 1024, 20000
MAX_ARCHIVE = 128 * 1024 * 1024


def sha(data):
    return hashlib.sha256(data).hexdigest()


def safe_path(path):
    if not isinstance(path, str):
        return False
    parts = PurePosixPath(path).parts
    return (0 < len(path) <= 1024 and '\\' not in path and ':' not in path
            and not any(ord(c) < 32 for c in path) and not path.startswith('/')
            and path == '/'.join(parts) and all(p not in ('', '.', '..') for p in parts))


def allowed(path):
    if not safe_path(path):
        return False
    parts = PurePosixPath(path).parts
    if any(p in SKIP or p.startswith('.open-next-old-') or p.startswith('.env') for p in parts):
        return False
    if parts[-1] in PRIVATE or path.endswith(SUFFIXES):
        return False
    return len(parts) == 1 or path in EVIDENCE or any(path.startswith(root + '/') for root in ROOTS)


def scan(path, data):
    if any(re.search(pattern, data) for pattern in SECRET_PATTERNS):
        raise ValueError(f'Potential credential in {path}; no value is printed')
    for match in re.finditer(rb'''postgres(?:ql)?://[^\s:/"'`]+:([^\s@"'`]+)@([^\s/:"'`]+)''', data):
        password, host = match.groups()
        if host not in (b'127.0.0.1', b'localhost', b'postgres') or password not in (
                b'password', b'secret', b'pass', b'postgres', b'test', b'test-password',
                b'probe-password', b'<password>', b'PASSWORD', b'CHANGE_ME', b'unused', b'{db_password}', b'${password}'):
            raise ValueError(f'Potential database credential in {path}; no value is printed')


def collect(root):
    root = Path(root)
    if root.is_symlink() or root.resolve() != root.absolute():
        raise ValueError('Source root must be canonical and not linked')
    paths = []
    for directory, dirs, files in os.walk(root, followlinks=False):
        relative = Path(directory).relative_to(root)
        def descend(name):
            directory = (relative / name).as_posix()
            return (not any(p in SKIP or p.startswith('.env') or p.startswith('.open-next-old-') for p in PurePosixPath(directory).parts)
                    and (allowed(directory + '/probe') or any(p.startswith(directory + '/') for p in (*ROOTS, *EVIDENCE))))
        dirs[:] = sorted(d for d in dirs if descend(d))
        if any((Path(directory) / d).is_symlink() for d in dirs):
            raise ValueError('Source directory links are forbidden')
        for name in sorted(files):
            path = relative / name
            if allowed(path.as_posix()):
                if (root / path).is_symlink() or not (root / path).is_file():
                    raise ValueError('Source links/nonregular files are forbidden')
                paths.append(path.as_posix())
    return sorted(paths)


def pack(root, destination, base_commit):
    root, destination = Path(root), Path(destination)
    if not re.fullmatch('[a-f0-9]{40}', base_commit):
        raise ValueError('Exact base Git commit required')
    if destination.exists() or destination.is_symlink():
        raise ValueError('Refusing to overwrite an archive')
    paths = collect(root)
    if not paths or len(paths) > MAX_FILES:
        raise ValueError('Invalid source inventory')
    fd, temporary = tempfile.mkstemp(prefix='.source-handoff-', dir=destination.parent)
    total, records = 0, []
    try:
        with os.fdopen(fd, 'wb') as output, zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
            for path in paths:
                file = root / path
                if file.stat().st_size > MAX_FILE:
                    raise ValueError('Source file budget exceeded')
                data = file.read_bytes()
                total += len(data)
                if total > MAX_TOTAL:
                    raise ValueError('Source total budget exceeded')
                scan(path, data)
                mode = 0o755 if file.stat().st_mode & 0o111 else 0o644
                info = zipfile.ZipInfo('source/' + path)
                info.create_system, info.external_attr, info.compress_type = 3, (stat.S_IFREG | mode) << 16, zipfile.ZIP_DEFLATED
                archive.writestr(info, data)
                records.append({'path': path, 'bytes': len(data), 'sha256': sha(data), 'mode': mode})
            manifest = {'schemaVersion': 1, 'kind': 'source_snapshot_not_runtime_backup', 'baseCommit': base_commit,
                        'gitHistoryIncluded': False, 'cloudWrites': False, 'files': records,
                        'excluded': ['credentials/env files', 'database/media runtime', 'dependency/build caches',
                                     'release journals/private evidence', 'non-allowlisted reports'],
                        'secretReview': 'bounded path and token-pattern scan; not a universal secret detector'}
            archive.writestr('HANDOFF.json', json.dumps(manifest, indent=2) + '\n')
        if Path(temporary).stat().st_size > MAX_ARCHIVE:
            raise ValueError('Archive budget exceeded')
        pin = sha(Path(temporary).read_bytes())
        verify(temporary, pin)
        os.link(temporary, destination)
        return {'archive': str(destination.resolve()), 'sha256': pin, 'files': len(records),
                'sourceBytes': total, 'archiveBytes': destination.stat().st_size, 'baseCommit': base_commit}
    finally:
        Path(temporary).unlink(missing_ok=True)


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('Duplicate JSON key')
        result[key] = value
    return result


def verify(archive, pin):
    archive = Path(archive)
    if not re.fullmatch('[a-f0-9]{64}', pin) or archive.stat().st_size > MAX_ARCHIVE:
        raise ValueError('External SHA-256 and bounded archive required')
    data = archive.read_bytes()
    if sha(data) != pin:
        raise ValueError('Archive digest mismatch')
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        entries = z.infolist()
        names = [item.filename for item in entries]
        if len(names) != len(set(names)) or len(names) > MAX_FILES + 1 or 'HANDOFF.json' not in names:
            raise ValueError('Invalid ZIP inventory')
        if z.getinfo('HANDOFF.json').file_size > 8 * 1024 * 1024:
            raise ValueError('Manifest budget exceeded')
        manifest = json.loads(z.read('HANDOFF.json'), object_pairs_hook=unique_object)
        if (manifest.get('schemaVersion') != 1 or manifest.get('kind') != 'source_snapshot_not_runtime_backup'
                or not re.fullmatch('[a-f0-9]{40}', manifest.get('baseCommit', ''))
                or manifest.get('gitHistoryIncluded') is not False or manifest.get('cloudWrites') is not False):
            raise ValueError('Invalid source manifest')
        files = manifest['files']
        if not files or len(files) > MAX_FILES:
            raise ValueError('Invalid manifest inventory')
        expected = ['HANDOFF.json'] + ['source/' + row['path'] for row in files]
        if sorted(names) != sorted(expected) or len(expected) != len(set(expected)):
            raise ValueError('ZIP/manifest inventory mismatch')
        total = 0
        for row in files:
            path, size = row['path'], row['bytes']
            if (not allowed(path) or type(size) is not int or not 0 <= size <= MAX_FILE
                    or row['mode'] not in (0o644, 0o755)):
                raise ValueError('Unsafe manifest path or bounds')
            entry = z.getinfo('source/' + path)
            mode = entry.external_attr >> 16
            total += size
            if total > MAX_TOTAL or entry.file_size != size or not stat.S_ISREG(mode):
                raise ValueError('Invalid ZIP file type or bounds')
            body = z.read(entry)
            if sha(body) != row['sha256']:
                raise ValueError('Source file digest mismatch')
            scan(path, body)
        return manifest


def extract(archive, pin, destination):
    destination = Path(destination)
    if destination.exists() or destination.is_symlink():
        raise ValueError('Extraction requires a new destination')
    manifest = verify(archive, pin)
    data = Path(archive).read_bytes()
    if sha(data) != pin:
        raise ValueError('Archive changed before extraction')
    destination.mkdir(mode=0o700)
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            for row in manifest['files']:
                file = destination / row['path']
                file.parent.mkdir(parents=True, exist_ok=True)
                with file.open('xb') as stream:
                    stream.write(z.read('source/' + row['path']))
                file.chmod(row['mode'])
        return {'status': 'verified_and_extracted', 'directory': str(destination.resolve()), 'files': len(manifest['files'])}
    except Exception:
        shutil.rmtree(destination)
        raise


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['pack', 'verify', 'extract'])
    parser.add_argument('--repo', type=Path)
    parser.add_argument('--archive', required=True, type=Path)
    parser.add_argument('--pin')
    parser.add_argument('--destination', type=Path)
    args = parser.parse_args()
    if args.action == 'pack':
        if not args.repo or args.pin or args.destination:
            parser.error('pack requires --repo and no extraction options')
        commit = subprocess.check_output(['git', '-C', args.repo, 'rev-parse', 'HEAD'], text=True).strip()
        result = pack(args.repo.resolve(), args.archive, commit)
    else:
        if not args.pin or args.repo or (args.action == 'extract') != bool(args.destination):
            parser.error('verify/extract require --pin; only extract requires --destination')
        result = extract(args.archive, args.pin, args.destination) if args.action == 'extract' else {
            'status': 'verified', 'files': len(verify(args.archive, args.pin)['files'])}
    print(json.dumps(result))
