import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('key_custody', Path(__file__).with_name('payload-key-custody.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class KeyCustodyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.source = self.root / 'source.key'
        self.source.write_bytes(b's' * 32)
        self.source.chmod(0o600)
        self.destination = self.root / 'destination.key'

    def test_same_filesystem_copy_refused_without_side_effect(self):
        with self.assertRaisesRegex(ValueError, 'separate writable filesystem'):
            module.copy_key(self.source, self.destination)
        self.assertFalse(self.destination.exists())

    def test_same_filesystem_verification_never_counts_as_independent(self):
        self.destination.write_bytes(b's' * 32)
        self.destination.chmod(0o600)
        with self.assertRaisesRegex(ValueError, 'same filesystem'):
            module.verify_copy(self.source, self.destination)

    def test_links_public_permissions_and_wrong_length_refused(self):
        self.destination.symlink_to(self.source)
        with self.assertRaisesRegex(ValueError, 'Linked'):
            module.private_key(self.destination)
        self.source.chmod(0o644)
        with self.assertRaisesRegex(ValueError, 'private regular'):
            module.private_key(self.source)
        self.source.chmod(0o600)
        self.source.write_bytes(b'bad')
        with self.assertRaisesRegex(ValueError, '32-byte'):
            module.private_key(self.source)

    def test_distinct_volume_copy_is_not_claimed_as_offsite_or_cross_machine(self):
        self.destination.write_bytes(b's' * 32)
        self.destination.chmod(0o600)
        original = Path.stat
        def different_device(path, **kwargs):
            value = original(path, **kwargs)
            if path == self.destination:
                values = list(value)
                values[2] += 1
                return os.stat_result(values)
            return value
        with patch.object(Path, 'stat', different_device):
            result = module.verify_copy(self.source, self.destination)
            self.assertTrue(result['separateFilesystem'])
            self.assertFalse(result['offsiteCustodyVerified'])
            self.assertFalse(result['crossMachineApplicationStartup'])
            self.destination.write_bytes(b'x' * 32)
            with self.assertRaisesRegex(ValueError, 'does not match'):
                module.verify_copy(self.source, self.destination)


if __name__ == '__main__':
    unittest.main()
