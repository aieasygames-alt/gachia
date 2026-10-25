"""Restore a double-digest-pinned Worker without extracting arbitrary tar paths."""
import hashlib
import io
import json
import posixpath
from pathlib import Path
import stat
import sys
import tarfile
import zipfile


def restore(archive, zip_digest, tar_digest, app):
    app = Path(app)
    output = app / '.open-next'
    if output.exists() or output.is_symlink() or not app.is_dir() or app.is_symlink():
        raise ValueError('Fresh non-linked app output required')
    data = Path(archive).read_bytes()
    if len(data) > 128 * 1024 * 1024 or hashlib.sha256(data).hexdigest() != zip_digest:
        raise ValueError('ZIP digest/budget mismatch')
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        if z.namelist() != ['web-worker.tar.gz']:
            raise ValueError('Unexpected archive members')
        entry = z.getinfo('web-worker.tar.gz')
        if entry.file_size > 128 * 1024 * 1024 or stat.S_ISLNK(entry.external_attr >> 16):
            raise ValueError('Invalid tar entry')
        payload = z.read(entry)
    if hashlib.sha256(payload).hexdigest() != tar_digest:
        raise ValueError('Inner tar digest mismatch')
    with tarfile.open(fileobj=io.BytesIO(payload), mode='r:gz') as tar:
        members = tar.getmembers()
        if len(members) > 50000 or sum(m.size for m in members) > 512 * 1024 * 1024:
            raise ValueError('Expanded archive budget exceeded')
        paths = {}
        for member in members:
            name = member.name.rstrip('/')
            if (not name or name.split('/')[0] != '.open-next' or '\\' in name
                    or any(p in ('', '.', '..') for p in name.split('/')) or name in paths):
                raise ValueError('Unsafe/duplicate artifact path')
            if not (member.isdir() or member.isfile() or member.issym()):
                raise ValueError('Unsupported artifact entry')
            if member.issym():
                target = posixpath.normpath(posixpath.join(posixpath.dirname(name), member.linkname))
                if (member.linkname.startswith('/') or '\\' in member.linkname
                        or not target.startswith('.open-next/')):
                    raise ValueError('External artifact link')
            paths[name] = member
        for name in paths:
            for parent in Path(name).parents:
                if str(parent) in paths and not paths[str(parent)].isdir():
                    raise ValueError('Artifact parent is a file/link')
        for name, member in paths.items():
            target = app / name
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
            elif member.isfile():
                target.parent.mkdir(parents=True, exist_ok=True)
                with target.open('xb') as f:
                    f.write(tar.extractfile(member).read())
        for name, member in paths.items():
            if member.issym():
                target = app / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.symlink_to(member.linkname)
        for name, member in paths.items():
            if member.issym():
                target = (app / name).resolve(strict=True)
                if output.resolve() not in target.parents:
                    raise ValueError('Unresolved/external artifact link')
    return {'entries': len(paths), 'zipSha256': zip_digest, 'tarSha256': tar_digest}


if __name__ == '__main__':
    print(json.dumps(restore(*sys.argv[1:])))
