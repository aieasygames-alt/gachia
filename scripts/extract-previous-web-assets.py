"""Extract only regular Next static assets from a digest-pinned Actions archive."""

import hashlib
import io
import json
import stat
from pathlib import Path, PurePosixPath
import sys
import tarfile
import zipfile


def extract(archive, expected_digest, output):
    archive = Path(archive)
    output = Path(output)
    if output.exists() or output.is_symlink():
        raise ValueError('Extraction directory must not exist')
    if archive.stat().st_size > 128 * 1024 * 1024:
        raise ValueError('Archive download budget exceeded')
    if hashlib.sha256(archive.read_bytes()).hexdigest() != expected_digest:
        raise ValueError('Archive digest mismatch')
    with zipfile.ZipFile(archive) as z:
        if z.namelist() != ['web-worker.tar.gz']:
            raise ValueError('Unexpected Actions archive members')
        entry = z.getinfo('web-worker.tar.gz')
        if stat.S_ISLNK(entry.external_attr >> 16):
            raise ValueError('Actions archive member must not be a link')
        if entry.file_size > 128 * 1024 * 1024:
            raise ValueError('Worker archive budget exceeded')
        tar_bytes = z.read(entry)
    prefix = '.open-next/assets/_next/static/'
    files = []
    seen = set()
    total = 0
    # Never extract server code, HTML, caches, links or arbitrary archive paths.
    unpacked = 0
    with tarfile.open(fileobj=io.BytesIO(tar_bytes), mode='r:gz') as tar:
        entries = 0
        for member in tar:
            entries += 1
            unpacked += member.size
            if entries > 50000 or unpacked > 512 * 1024 * 1024:
                raise ValueError('Expanded worker archive budget exceeded')
            name = member.name
            if not name.startswith(prefix):
                continue
            rel = name[len(prefix):].rstrip('/')
            if not rel:
                continue
            parts = PurePosixPath(rel).parts
            if not parts or '\\' in rel or rel.startswith('/') or any(p in ('.', '..', '') for p in rel.split('/')):
                raise ValueError('Unsafe static asset path')
            if rel in seen:
                raise ValueError('Duplicate static asset path')
            seen.add(rel)
            if member.isdir():
                continue
            if not member.isfile() or member.issym() or member.islnk():
                raise ValueError('Static assets must be regular files')
            total += member.size
            if total > 64 * 1024 * 1024 or len(files) >= 5000:
                raise ValueError('Static asset budget exceeded')
            files.append((rel, tar.extractfile(member).read()))
    if not files:
        raise ValueError('No previous Next static assets')
    file_paths = {rel for rel, _ in files}
    for rel in seen:
        if any(str(parent) in file_paths for parent in PurePosixPath(rel).parents):
            raise ValueError('Static file/directory collision')
    output.mkdir(mode=0o700)
    for rel, data in files:
        target = output.joinpath(*PurePosixPath(rel).parts)
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open('xb') as f:
            f.write(data)
    return {'files': len(files), 'bytes': total, 'scope': 'next_static_only'}


if __name__ == '__main__':
    try:
        if len(sys.argv) != 4:
            raise ValueError('Usage: extract-previous-web-assets.py <zip> <sha256> <new-directory>')
        print(json.dumps(extract(*sys.argv[1:])))
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
