import copy
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    'desktop_backup', Path(__file__).resolve().parents[1] / 'services/content-cms/scripts/desktop.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class BackupRestoreTests(unittest.TestCase):
    def snapshot(self):
        return {'format': module.CANONICAL_DATA_FORMAT, 'tables': [{
            'name': 'public."records"', 'columns': [{'name': 'title', 'type': 'text', 'notNull': False}],
            'constraints': [], 'rows': ['{"title": "one\\ntwo"}', '{"title": "second"}']}],
            'sequences': [{'name': 'public."records_id_seq"', 'definition': {'increment': 1},
                           'state': {'lastValue': 85, 'isCalled': True}}]}

    def test_row_order_does_not_change_digest(self):
        left = self.snapshot()
        right = copy.deepcopy(left)
        right['tables'][0]['rows'].reverse()
        self.assertEqual(module.canonical_data_hash(left), module.canonical_data_hash(right))

    def test_duplicates_and_real_changes_are_not_discarded(self):
        baseline = self.snapshot()
        mutations = [
            lambda s: s['tables'][0]['rows'].append(s['tables'][0]['rows'][0]),
            lambda s: s['tables'][0]['rows'].__setitem__(0, '{"title": "different"}'),
            lambda s: s['tables'][0]['columns'][0].update(type='varchar(20)'),
            lambda s: s['tables'][0]['columns'][0].update(default="'example'::text"),
            lambda s: s['tables'][0]['columns'][0].update(notNull=True),
            lambda s: s['tables'][0]['constraints'].append({'definition': 'UNIQUE (title)'}),
            lambda s: s['tables'].clear(),
            lambda s: s['sequences'][0]['state'].update(lastValue=86),
            lambda s: s['sequences'][0]['state'].update(isCalled=False),
            lambda s: s['sequences'][0]['definition'].update(increment=2),
        ]
        expected = module.canonical_data_hash(baseline)
        for mutate in mutations:
            with self.subTest(mutate=mutate):
                changed = copy.deepcopy(baseline)
                mutate(changed)
                self.assertNotEqual(module.canonical_data_hash(changed), expected)

    def test_json_row_precision_and_newlines_remain_distinct(self):
        left, right = self.snapshot(), self.snapshot()
        left['tables'][0]['rows'] = ['{"value": 1.000000000000000001}']
        right['tables'][0]['rows'] = ['{"value": 1.000000000000000002}']
        self.assertNotEqual(module.canonical_data_hash(left), module.canonical_data_hash(right))
        right['tables'][0]['rows'] = ['{"title": "one"}', '{"title": "two"}']
        self.assertNotEqual(module.canonical_data_hash(self.snapshot()), module.canonical_data_hash(right))

    def test_new_manifest_uses_only_canonical_comparison(self):
        manifest = {'logicalDigest': 'legacy', 'canonicalDataFormat': module.CANONICAL_DATA_FORMAT,
                    'canonicalDataDigest': 'a' * 64}
        with patch.object(module, 'canonical_data_digest', return_value='a' * 64) as canonical, \
                patch.object(module, 'logical_digest', side_effect=AssertionError('No legacy fallback')):
            module.verify_restored_data({}, 'restored', manifest)
            canonical.assert_called_once_with({}, 'restored')
        with patch.object(module, 'canonical_data_digest', return_value='b' * 64):
            with self.assertRaisesRegex(RuntimeError, 'canonical database data differs'):
                module.verify_restored_data({}, 'restored', manifest)

    def test_legacy_backups_retain_strict_original_comparison(self):
        manifest = {'logicalDigest': 'legacy'}
        with patch.object(module, 'logical_digest', return_value='legacy'), \
                patch.object(module, 'canonical_data_digest', side_effect=AssertionError('Not a new manifest')):
            module.verify_restored_data({}, 'restored', manifest)
        with patch.object(module, 'logical_digest', return_value='different'):
            with self.assertRaisesRegex(RuntimeError, 'logical database data differs'):
                module.verify_restored_data({}, 'restored', manifest)

    def test_partial_unknown_and_malformed_formats_fail_closed(self):
        for manifest in [
            {'canonicalDataFormat': module.CANONICAL_DATA_FORMAT},
            {'canonicalDataDigest': 'a' * 64},
            {'canonicalDataFormat': 'future', 'canonicalDataDigest': 'a' * 64},
            *[{'canonicalDataFormat': module.CANONICAL_DATA_FORMAT, 'canonicalDataDigest': value}
              for value in [None, 42, 'a' * 63, 'A' * 64, 'z' * 64]],
        ]:
            with self.subTest(manifest=manifest):
                with patch.object(module, 'logical_digest', side_effect=AssertionError('No fallback')):
                    with self.assertRaisesRegex(RuntimeError, 'Invalid canonical'):
                        module.verify_restored_data({}, 'restored', manifest)

    def test_snapshot_query_quotes_names_and_covers_rows_columns_sequences(self):
        inventory = {'tables': ['a"b\'c'], 'sequences': ['a"b\'c_seq']}
        with patch.object(module, 'sql', side_effect=[json.dumps(inventory), json.dumps(self.snapshot())]) as sql:
            self.assertEqual(module.canonical_data_digest({}, 'test'), module.canonical_data_hash(self.snapshot()))
            statement = sql.call_args.args[1]
            self.assertIn('FROM public."a""b\'c" t', statement)
            self.assertIn("'public.\"a\"\"b''c\"'::regclass", statement)
            for required in ['pg_attribute', 'pg_get_expr', 'pg_get_constraintdef', 'pg_sequence',
                             'last_value', 'is_called', 'to_jsonb(t)::text']:
                self.assertIn(required, statement)


if __name__ == '__main__':
    unittest.main()
