import importlib.util
import json
from pathlib import Path
import stat
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location('handoff', Path(__file__).with_name('payload-source-handoff.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class HandoffTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.repo = self.root / 'repo'
        self.repo.mkdir()
        self.put('package.json', '{"private":true}\n')
        self.put('scripts/tool.py', 'print("local")\n')
        self.archive = self.root / 'source.zip'

    def put(self, path, content):
        file = self.repo / path
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text(content)
        return file

    def pack(self):
        return m.pack(self.repo, self.archive, 'a' * 40)

    def malicious(self, path='scripts/tool.py', mode=stat.S_IFREG | 0o644, content=b'changed'):
        body = b'print("local")\n'
        row = {'path': path, 'bytes': len(body), 'sha256': m.sha(body), 'mode': 0o644}
        manifest = {'schemaVersion': 1, 'kind': 'source_snapshot_not_runtime_backup', 'baseCommit': 'a' * 40,
                    'gitHistoryIncluded': False, 'cloudWrites': False, 'files': [row]}
        with zipfile.ZipFile(self.archive, 'w') as z:
            entry = zipfile.ZipInfo('source/' + path)
            entry.external_attr = mode << 16
            z.writestr(entry, content)
            z.writestr('HANDOFF.json', json.dumps(manifest))
        return m.sha(self.archive.read_bytes())

    def test_round_trip_and_executable_mode(self):
        (self.repo / 'scripts/tool.py').chmod(0o755)
        result = self.pack()
        self.assertEqual(result['files'], 2)
        output = self.root / 'restored'
        m.extract(self.archive, result['sha256'], output)
        self.assertEqual((output / 'scripts/tool.py').read_bytes(), (self.repo / 'scripts/tool.py').read_bytes())
        self.assertEqual((output / 'scripts/tool.py').stat().st_mode & 0o777, 0o755)

    def test_runtime_credentials_caches_and_unapproved_reports_are_excluded(self):
        for path in ['.env', 'services/content-cms/.env.editor.example', 'services/content-cms/.local/probe.db',
                     'services/content-cms/node_modules/x/index.js', 'apps/web/.open-next/worker.js',
                     'scripts/settings.json', 'scripts/initial-admin.txt', 'reports/private/token.json']:
            self.put(path, 'private-runtime-value')
        self.assertEqual(self.pack()['files'], 2)

    def test_secret_like_source_fails_without_publishing_partial_archive(self):
        self.put('scripts/unsafe.js', 'const token="ghp_' + 'x' * 36 + '";')
        with self.assertRaisesRegex(ValueError, 'Potential credential'):
            self.pack()
        self.assertFalse(self.archive.exists())

    def test_real_database_url_is_rejected_but_test_fixture_is_allowed(self):
        self.put('scripts/fixture.js', '"postgres://app:password@127.0.0.1:54329/cms_probe_test"')
        self.put('scripts/bad.js', '"postgres://' + 'owner:actual-private-password@db.example.com/cms"')
        with self.assertRaisesRegex(ValueError, 'database credential'):
            self.pack()

    def test_loopback_build_values_and_interpolated_placeholders_are_not_credentials(self):
        for name, password in [('build', 'unused'), ('python', '{db_password}'), ('typescript', '${password}')]:
            self.put(f'scripts/{name}.txt', 'postgres://app:' + password + '@127.0.0.1/cms_build')
        self.assertEqual(self.pack()['files'], 5)

    def test_symlink_source_is_rejected(self):
        (self.repo / 'scripts/linked.py').symlink_to(self.repo / 'scripts/tool.py')
        with self.assertRaisesRegex(ValueError, 'links'):
            self.pack()

    def test_nested_cms_source_and_allowlisted_evidence_are_included(self):
        self.put('services/content-cms/src/app.ts', 'export const source = true;')
        self.put('reports/payload-nte-cloud-protocol-2026-11-02/assets.json', '{}')
        self.put('reports/payload-migration-2026-10-28/inventory.json', '{}')
        self.put('reports/shadow-fixture-2026-10-31.json', '{}')
        self.assertEqual(self.pack()['files'], 6)

    def test_cms_runtime_and_ledger_report_dependencies_are_explicitly_allowlisted(self):
        for path in ['reports/payload-migration-2026-10-28/inventory.json',
                     'reports/payload-migration-2026-10-28/record-plan-v2.json',
                     'reports/owner-media-manifest-2026-10-31.json',
                     'reports/owner-media-runtime-audit-2026-10-31.json',
                     'reports/payload-status-audit-2026-10-30/batch17-shadow.json',
                     'reports/shadow-fixture-2026-10-31.json',
                     'reports/payload-next-phase-2026-11-01/shadow-split-fixture.json']:
            self.assertTrue(m.allowed(path), path)

    def test_archive_and_destination_never_overwrite_existing_paths(self):
        result = self.pack()
        with self.assertRaisesRegex(ValueError, 'overwrite'):
            self.pack()
        output = self.root / 'restored'
        output.mkdir()
        with self.assertRaisesRegex(ValueError, 'new destination'):
            m.extract(self.archive, result['sha256'], output)

    def test_existing_release_gate_keeps_its_complete_withdrawal_evidence(self):
        for path in ['characters.json', 'guides.json', 'ledger.json', 'images/meewee.webp',
                     'images/sparka.webp', 'images/cerulla.webp']:
            self.assertTrue(m.allowed('reports/content-integrity/archive/s2-14/' + path), path)
        self.assertFalse(m.allowed('reports/content-integrity/archive/s2-14/unreviewed.json'))

    def test_wrong_archive_pin_is_rejected_before_extraction(self):
        self.pack()
        output = self.root / 'restored'
        with self.assertRaisesRegex(ValueError, 'digest'):
            m.extract(self.archive, 'b' * 64, output)
        self.assertFalse(output.exists())

    def test_repinned_archive_with_changed_file_fails(self):
        with self.assertRaises(ValueError):
            m.verify(self.archive, self.malicious(content=b'not the original'))

    def test_traversal_private_path_and_link_are_rejected(self):
        for path, mode in [('../escaped', stat.S_IFREG | 0o644), ('scripts/.env', stat.S_IFREG | 0o644),
                           ('scripts/tool.py', stat.S_IFLNK | 0o777), ('scripts/../escaped.py', stat.S_IFREG | 0o644)]:
            with self.subTest(path=path, mode=mode):
                pin = self.malicious(path, mode, b'print("local")\n')
                with self.assertRaises(ValueError):
                    m.verify(self.archive, pin)

    def test_extra_zip_file_is_rejected_even_with_new_external_pin(self):
        self.pack()
        with zipfile.ZipFile(self.archive, 'a') as z:
            z.writestr('unlisted.txt', 'extra')
        with self.assertRaisesRegex(ValueError, 'inventory mismatch'):
            m.verify(self.archive, m.sha(self.archive.read_bytes()))


if __name__ == '__main__':
    unittest.main()
