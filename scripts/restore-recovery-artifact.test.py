import hashlib
import importlib.util
import io
from pathlib import Path
import tarfile
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location('restore', Path(__file__).with_name('restore-recovery-artifact.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class RestoreTest(unittest.TestCase):
    def fixture(self, entries):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        root = Path(temp.name)
        app = root / 'app'
        app.mkdir()
        stream = io.BytesIO()
        with tarfile.open(fileobj=stream, mode='w:gz') as tar:
            for name, link in entries:
                member = tarfile.TarInfo(name)
                if link is not None:
                    member.type = tarfile.SYMTYPE
                    member.linkname = link
                    tar.addfile(member)
                else:
                    member.size = 6
                    tar.addfile(member, io.BytesIO(b'sealed'))
        archive = root / 'worker.zip'
        with zipfile.ZipFile(archive, 'w') as z:
            z.writestr('web-worker.tar.gz', stream.getvalue())
        return archive, hashlib.sha256(archive.read_bytes()).hexdigest(), hashlib.sha256(stream.getvalue()).hexdigest(), app

    def test_regular_files_and_internal_links(self):
        args = self.fixture([('.open-next/worker.js', None), ('.open-next/server/link.js', '../worker.js')])
        self.assertEqual(module.restore(*args)['entries'], 2)
        self.assertEqual((args[3] / '.open-next/server/link.js').read_text(), 'sealed')
        with self.assertRaises(ValueError):
            module.restore(*args)

    def test_unsafe_paths_and_external_links_fail_before_writing(self):
        for name, link in [('../outside', None), ('/outside', None), ('.open-next/../outside', None),
                           ('.open-next/a', '/outside'), ('.open-next/a', '../../outside'),
                           ('.open-next/a\\b', None)]:
            args = self.fixture([(name, link)])
            with self.subTest(name=name), self.assertRaises(ValueError):
                module.restore(*args)
            self.assertFalse((args[3] / '.open-next').exists())

    def test_digests_and_collisions(self):
        args = self.fixture([('.open-next/worker.js', None)])
        for position in (1, 2):
            bad = list(args)
            bad[position] = '0' * 64
            with self.assertRaises(ValueError):
                module.restore(*bad)
        for entries in [[('.open-next/a', None), ('.open-next/a', None)],
                        [('.open-next/a', 'worker.js'), ('.open-next/a/b', None)]]:
            with self.assertRaises(ValueError):
                module.restore(*self.fixture(entries))


if __name__ == '__main__':
    unittest.main()
