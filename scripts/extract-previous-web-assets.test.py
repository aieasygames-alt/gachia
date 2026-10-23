import hashlib
import importlib.util
import io
from pathlib import Path
import tarfile
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location('extractor', Path(__file__).with_name('extract-previous-web-assets.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
PREFIX = '.open-next/assets/_next/static/'


class ExtractionTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def archive(self, entries, zip_name='web-worker.tar.gz'):
        payload = io.BytesIO()
        with tarfile.open(fileobj=payload, mode='w:gz') as tar:
            for name, kind in entries:
                item = tarfile.TarInfo(name)
                item.type = kind
                if kind == tarfile.REGTYPE:
                    item.size = 7
                    tar.addfile(item, io.BytesIO(b'fixture'))
                else:
                    item.linkname = '/outside'
                    tar.addfile(item)
        archive = self.root / 'worker.zip'
        with zipfile.ZipFile(archive, 'w') as z:
            z.writestr(zip_name, payload.getvalue())
        return archive, hashlib.sha256(archive.read_bytes()).hexdigest(), self.root / 'static'

    def test_static_only_no_server_html_or_cache(self):
        args = self.archive([(PREFIX + 'chunks/old.js', tarfile.REGTYPE),
                             ('.open-next/worker.js', tarfile.REGTYPE),
                             ('.open-next/assets/zh.html', tarfile.REGTYPE),
                             ('.open-next/cache/page', tarfile.REGTYPE)])
        self.assertEqual(module.extract(*args)['files'], 1)
        self.assertEqual([str(p.relative_to(args[2])) for p in args[2].rglob('*') if p.is_file()], ['chunks/old.js'])

    def test_digest(self):
        archive, _, output = self.archive([(PREFIX + 'old.js', tarfile.REGTYPE)])
        with self.assertRaisesRegex(ValueError, 'digest'):
            module.extract(archive, '0' * 64, output)
        self.assertFalse(output.exists())

    def test_unexpected_zip_member(self):
        with self.assertRaisesRegex(ValueError, 'archive members'):
            module.extract(*self.archive([(PREFIX + 'old.js', tarfile.REGTYPE)], 'unexpected'))

    def test_traversal_and_ambiguous_paths(self):
        for name in ['../outside', '/outside', 'chunks/./old.js', 'chunks//old.js', 'chunks\\old.js']:
            with self.subTest(name=name), self.assertRaisesRegex(ValueError, 'Unsafe'):
                module.extract(*self.archive([(PREFIX + name, tarfile.REGTYPE)]))

    def test_links_and_special_files(self):
        for kind in [tarfile.SYMTYPE, tarfile.LNKTYPE, tarfile.FIFOTYPE]:
            with self.subTest(kind=kind), self.assertRaisesRegex(ValueError, 'regular files'):
                module.extract(*self.archive([(PREFIX + 'old.js', kind)]))

    def test_duplicates_and_file_directory_collisions_before_write(self):
        for names in [['old.js', 'old.js'], ['chunk', 'chunk/old.js']]:
            args = self.archive([(PREFIX + name, tarfile.REGTYPE) for name in names])
            with self.assertRaises(ValueError):
                module.extract(*args)
            self.assertFalse(args[2].exists())

    def test_empty(self):
        with self.assertRaisesRegex(ValueError, 'No previous'):
            module.extract(*self.archive([('.open-next/worker.js', tarfile.REGTYPE)]))

    def test_existing_output_is_never_overwritten(self):
        args = self.archive([(PREFIX + 'old.js', tarfile.REGTYPE)])
        args[2].mkdir()
        with self.assertRaisesRegex(ValueError, 'must not exist'):
            module.extract(*args)

    def test_file_count_budget(self):
        args = self.archive([(PREFIX + str(i), tarfile.REGTYPE) for i in range(5001)])
        with self.assertRaisesRegex(ValueError, 'budget'):
            module.extract(*args)
        self.assertFalse(args[2].exists())


if __name__ == '__main__':
    unittest.main()
