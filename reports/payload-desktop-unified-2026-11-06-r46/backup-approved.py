"""Cold-back up the new approved content and verify a separate database/media restore."""
import datetime
import fcntl
import hashlib
import importlib.util
import json
import os
from pathlib import Path

os.umask(0o077)
report = Path(__file__).resolve().parent
root = Path.home() / 'Library/Application Support/GachiaCMS'
spec = importlib.util.spec_from_file_location('r46_backup_manager', root / 'desktop.py')
manager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(manager)
with (root / 'maintenance.lock').open('a') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    cfg = manager.settings()
    assert json.loads((report / 'cms-edit-result.json').read_text())['status'] == 'cms_approved_not_website_activated'
    before = manager.canonical_data_digest(cfg, 'gachia_cms')
    media = manager.file_digests(root / 'data')
    backup = manager.backup(cfg)
    manager.restore_check(cfg, backup)
    restored = json.loads((backup / 'restore-check.json').read_text())
    assert restored['passed'] and restored['counts'] == '1|150|1'
    assert manager.canonical_data_digest(cfg, 'gachia_cms') == before
    assert manager.file_digests(root / 'data') == media and manager.health()
    result = {'at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'status': 'approved_content_backup_restored_separately',
        'backup': str(backup), 'manifestPin': hashlib.sha256((backup / 'manifest.json').read_bytes()).hexdigest(),
        'restore': restored, 'liveDatabaseUnchanged': True, 'liveMediaUnchanged': True,
        'canonicalDataDigest': before, 'cloudWrites': False, 'healthy': True}
    with (report / 'approved-backup.json').open('x') as stream:
        json.dump(result, stream, indent=2)
        stream.write('\n')
print(json.dumps(result, indent=2))
