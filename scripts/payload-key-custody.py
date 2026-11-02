"""Copy/verify a backup key on a separate private volume, without printing key bytes."""
import argparse
import hmac
import json
import os
from pathlib import Path
import stat


def private_key(path):
    path = Path(path).absolute()
    if path.resolve(strict=True) != path:
        raise ValueError('Linked key paths are forbidden')
    info = path.stat()
    if not stat.S_ISREG(info.st_mode) or info.st_mode & 0o077 or info.st_size != 32:
        raise ValueError('A private regular 32-byte key is required')
    return path, path.read_bytes()


def verify_copy(source, destination):
    source, original = private_key(source)
    destination, copied = private_key(destination)
    if source.stat().st_dev == destination.stat().st_dev:
        raise ValueError('Another directory on the same filesystem is not independent key storage')
    if not hmac.compare_digest(original, copied):
        raise ValueError('Key copy does not match; no key bytes are printed')
    return {'status': 'separate_volume_key_copy_verified', 'keyBytes': 32,
            'separateFilesystem': True, 'offsiteCustodyVerified': False,
            'crossMachineApplicationStartup': False}


def copy_key(source, destination):
    source, secret = private_key(source)
    destination = Path(destination).absolute()
    parent = destination.parent
    if parent.resolve(strict=True) != parent:
        raise ValueError('Linked destination directories are forbidden')
    directory = os.open(parent, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        info = os.fstat(directory)
        if info.st_dev == source.stat().st_dev:
            raise ValueError('A separate writable filesystem is required; same-filesystem copy refused')
        if info.st_uid != os.getuid() or info.st_mode & 0o077:
            raise ValueError('Destination directory must be owned by this user and private (0700)')
        fd = os.open(destination.name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=directory)
        try:
            with os.fdopen(fd, 'wb') as stream:
                stream.write(secret)
                stream.flush()
                os.fsync(stream.fileno())
        finally:
            # Never overwrite, remove or silently retry a possibly completed key copy.
            os.fsync(directory)
    finally:
        os.close(directory)
    return verify_copy(source, destination)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['copy', 'verify'])
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--destination', type=Path, required=True)
    args = parser.parse_args()
    if os.environ.get('CI') or os.environ.get('GITHUB_ACTIONS'):
        raise ValueError('Real key custody operations cannot run in CI')
    result = (copy_key if args.action == 'copy' else verify_copy)(args.source, args.destination)
    print(json.dumps(result))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError) as error:
        # File errors can identify a location, never include file contents.
        raise SystemExit(str(error))
