"""Save and explicitly approve one real structured edit through authenticated CMS REST."""
import copy
import datetime
import fcntl
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import urllib.error
import urllib.parse
import urllib.request

os.umask(0o077)
report = Path(__file__).resolve().parent
root = Path.home() / 'Library/Application Support/GachiaCMS'
private = root / 'operations/unified-r46-edit-ananta'
private.mkdir(parents=True, mode=0o700)
base = 'http://127.0.0.1:3100'
token = None

def save(file, value):
    with file.open('x') as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)
        stream.write('\n')

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise RuntimeError('Redirect forbidden')

client = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())

def request(route, method='GET', data=None, allow_missing=False):
    assert route.startswith('/api/')
    headers = {'Content-Type': 'application/json', 'Origin': base}
    if token:
        headers['Authorization'] = 'JWT ' + token
    req = urllib.request.Request(base + route, method=method, headers=headers,
        data=None if data is None else json.dumps(data).encode())
    try:
        with client.open(req, timeout=30) as response:
            assert response.status in [200, 201]
            return json.load(response)
    except urllib.error.HTTPError as error:
        if allow_missing and error.code == 404:
            return None
        raise RuntimeError(f'{method} {route.split("?")[0]} returned {error.code}; no retry') from None

def records(draft):
    value = request('/api/content-records?' + urllib.parse.urlencode({'draft': str(draft).lower(),
        'locale': 'all', 'fallback-locale': 'none', 'depth': 0, 'limit': 200, 'sort': 'id'}))
    assert value['totalDocs'] == 150 and len(value['docs']) == 150 and not value['hasNextPage']
    return {str(row['id']): row for row in value['docs']}

spec = importlib.util.spec_from_file_location('r46_edit_manager', root / 'desktop.py')
manager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(manager)
with (root / 'maintenance.lock').open('a') as maintenance:
    fcntl.flock(maintenance, fcntl.LOCK_EX | fcntl.LOCK_NB)
    cfg = manager.settings()
    imported = json.loads((report / 'import-ananta.json').read_text())
    assert imported['status'] == 'scope_imported_held_not_activated'
    assert manager.health() and manager.canonical_data_digest(cfg, 'gachia_cms') == imported['canonicalDataDigest']
    backup = manager.backup(cfg)
    credentials = (root / 'initial-admin.txt').read_text()
    login = request('/api/users/login', 'POST', {'email': re.search(r'^Email: (.+)$', credentials, re.M)[1],
        'password': re.search(r'^Password: (.+)$', credentials, re.M)[1]})
    assert login['user']['role'] in ['admin', 'reviewer']
    token = login['token']
    lock_id = None
    try:
        formal, drafts = records(False), records(True)
        matches = [row for row in drafts.values() if row['stableKey'].startswith('unified:ananta:')
            and row['sourceRecord']['sourcePath'] == 'packages/data/games/ananta/raw-guides.json'
            and row['sourceRecord']['locator'].get('identity') == {'id': 'download-install-guide'}]
        assert len(matches) == 1
        original = matches[0]
        ident, stable = str(original['id']), original['stableKey']
        assert original['_status'] == 'draft' and original['hold'] is True
        assert original['structuredValue'] == original['sourceRecord']['original']
        active = json.loads((report / 'baseline-release/active.json').read_text())
        source = next(row for row in active if row['sourcePath'] == original['legacyPath'])
        assert hashlib.sha256(source['text'].encode()).hexdigest() == source['sha256']
        public = next(row for row in json.loads(source['text']) if row['id'] == 'download-install-guide')
        assert public == original['structuredValue'], 'Public/editorial rebase required before writing'
        addition = (report / 'content-addition.zh.md').read_text().strip()
        assert addition and addition not in public['content']
        edited = copy.deepcopy(public)
        edited['content'] = public['content'].rstrip() + '\n\n' + addition
        assert {key: value for key, value in edited.items() if key != 'content'} == {key: value for key, value in public.items() if key != 'content'}
        save(private / 'formal-before.json', formal)
        save(private / 'drafts-before.json', drafts)
        save(report / 'content-intent.json', {'at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'game': 'ananta', 'stableKey': stable, 'recordID': ident, 'operation': 'edit_existing_structured_leaf',
            'changedFields': ['/content'], 'locale': 'zh', 'additionFile': 'content-addition.zh.md',
            'reason': 'Practical installation checklist; no new release-date, configuration, storage-size or game-mechanic claims.',
            'otherFieldsAndLanguagesUnchanged': True, 'coldBackup': str(backup), 'newMedia': False})
        cutoff = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(seconds=300)).isoformat()
        locks = request('/api/payload-locked-documents?' + urllib.parse.urlencode({
            'where[and][0][document.relationTo][equals]': 'content-records', 'where[and][1][document.value][equals]': ident,
            'where[and][2][updatedAt][greater_than]': cutoff, 'limit': 1}))
        assert locks['totalDocs'] == 0, 'Active editor lock; stop'
        lock_id = request('/api/payload-locked-documents', 'POST', {'document': {'relationTo': 'content-records', 'value': original['id']},
            'user': {'relationTo': 'users', 'value': login['user']['id']}})['doc']['id']
        route = '/api/content-records/' + ident
        assert request(route + '?draft=true&locale=all&fallback-locale=none&depth=0') == original
        save(private / 'draft-write-intent.json', {'structuredValue': edited})
        request(route + '?draft=true&locale=zh', 'PATCH', {'structuredValue': edited})
        saved = request(route + '?draft=true&locale=all&fallback-locale=none&depth=0')
        assert saved['structuredValue'] == edited and saved['hold'] is True and saved['_status'] == 'draft'
        assert records(False) == formal, 'Draft changed the formal document'
        save(private / 'saved-draft.json', saved)
        approval = {'structuredValue': edited, '_status': 'published', 'hold': False}
        save(private / 'approval-write-intent.json', approval)
        request(route + '?locale=zh', 'PATCH', approval)
        after, after_drafts = records(False), records(True)
        approved = after[ident]
        assert approved['_status'] == 'published' and approved['hold'] is False and approved['structuredValue'] == edited
        for key in ['stableKey', 'game', 'kind', 'legacyId', 'legacyPath', 'bodyFormat', 'sourceRecord', 'title', 'body', 'reviewEvidence']:
            assert approved[key] == original[key], key
        assert all(after[key] == row and after_drafts[key] == drafts[key] for key, row in formal.items() if key != ident)
        save(private / 'formal-after.json', after)
        save(private / 'drafts-after.json', after_drafts)
        save(report / 'selection-ananta.json', {'stableKeys': [stable]})
        save(report / 'cms-edit-result.json', {'at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'status': 'cms_approved_not_website_activated', 'stableKey': stable, 'recordID': ident, 'game': 'ananta',
            'changedFields': ['/content'], 'draftSavedAndReread': True, 'draftDidNotChangeFormalDocument': True,
            'approvedReread': True, 'other149RecordsUnchanged': True, 'otherFieldsAndLanguagesUnchanged': True,
            'privateSnapshots': str(private), 'cloudWrites': False, 'websiteChanged': False})
        print(json.dumps({'status': 'cms_approved_not_website_activated', 'stableKey': stable, 'recordID': ident,
            'other149RecordsUnchanged': True}, indent=2))
    finally:
        try:
            if lock_id is not None:
                request(f'/api/payload-locked-documents/{lock_id}', 'DELETE', allow_missing=True)
        finally:
            request('/api/users/logout', 'POST', {})
