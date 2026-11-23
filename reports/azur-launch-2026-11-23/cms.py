"""One authenticated CMS record, explicit phases, no credential output or SQL writes."""
from pathlib import Path
import fcntl, gzip, hashlib, json, os, re, sys, urllib.request

os.umask(0o077)
ROOT = Path(__file__).resolve().parent
PRIVATE = Path.home() / 'Library/Application Support/GachiaCMS'
ORIGIN = 'http://127.0.0.1:3100'
ID = 310
TARGET = 'official-information-checklist'
PHASE = sys.argv[1]
assert PHASE in ['inspect', 'draft', 'review', 'verify']

def save(name, value):
    data = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()
    file = ROOT / name
    with file.open('xb') as stream:
        stream.write(data)
    return {'path': str(file), 'pin': hashlib.sha256(data).hexdigest()}

def load(name):
    return json.loads((ROOT / name).read_text())

def request(route, token=None, body=None, method=None):
    headers = {'Content-Type': 'application/json', 'Origin': ORIGIN, 'Connection': 'close'}
    if token:
        headers['Authorization'] = 'JWT ' + token
    data = json.dumps(body).encode() if body is not None else None
    call = urllib.request.Request(ORIGIN + route, data=data, headers=headers, method=method)
    with urllib.request.urlopen(call, timeout=60) as response:
        return json.load(response)

def doc(token, draft=True):
    value = request(f'/api/content-records/{ID}?draft={str(draft).lower()}&locale=all&fallback-locale=none&depth=0', token)
    assert value['sourceRecord']['game'] == 'azur-promilia'
    assert value['sourceRecord']['family'] == 'inline-guides'
    assert value['structuredValue']['id'] == TARGET
    return value

def all_records(token, draft):
    rows = []
    for page in range(1, 10):
        result = request(f'/api/content-records?draft={str(draft).lower()}&locale=all&fallback-locale=none&depth=0&limit=1000&sort=id&page={page}', token)
        rows.extend(result['docs'])
        if not result['hasNextPage']:
            assert len(rows) == result['totalDocs'] == 2966
            return rows
    raise RuntimeError('Bounded pagination exceeded')

with (PRIVATE / 'maintenance.lock').open('a') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    credentials = (PRIVATE / 'initial-admin.txt').read_text()
    login = request('/api/users/login', body={
        'email': re.search(r'^Email: (.+)$', credentials, re.M)[1],
        'password': re.search(r'^Password: (.+)$', credentials, re.M)[1]})
    assert login['user']['role'] == 'admin'
    token = login['token']
    try:
        if PHASE == 'inspect':
            draft = all_records(token, True)
            published = all_records(token, False)
            assert all_records(token, True) == draft, 'CMS concurrently modified'
            with (ROOT / 'cms-before.json.gz').open('xb') as stream:
                stream.write(gzip.compress(json.dumps({'draft': draft, 'published': published}).encode()))
            row = doc(token)
            assert row == next(r for r in draft if r['id'] == ID)
            save('cms-before-record.json', row)
            save('cms-before-proof.json', {'records': len(draft), 'id': ID, 'status': row['_status'],
                 'hold': row['hold'], 'snapshotSHA256': hashlib.sha256((ROOT / 'cms-before.json.gz').read_bytes()).hexdigest()})
        elif PHASE == 'draft':
            assert not (ROOT / 'cms-draft-intent.json').exists(), 'Do not replay CMS writes'
            row = doc(token)
            assert row == load('cms-before-record.json'), 'CMS record changed'
            edited = json.loads(json.dumps(row['structuredValue']))
            edited['content']['zh'] = (ROOT / 'content-zh.txt').read_text().rstrip('\n')
            assert edited['content']['zh'] != row['structuredValue']['content']['zh']
            save('cms-draft-intent.json', {'id': ID, 'previousUpdatedAt': row['updatedAt'], 'structuredValue': edited})
            request(f'/api/content-records/{ID}?draft=true&locale=all&depth=0&overrideLock=false', token,
                    {'structuredValue': edited, '_status': 'draft', 'hold': True}, 'PATCH')
            current = doc(token)
            assert current['structuredValue'] == edited and current['_status'] == 'draft' and current['hold']
            save('cms-draft.json', current)
        elif PHASE == 'review':
            assert not (ROOT / 'cms-review-intent.json').exists(), 'Do not replay reviews'
            row = doc(token)
            assert row == load('cms-draft.json'), 'CMS draft changed'
            old = load('cms-before-record.json')
            restored = json.loads(json.dumps(row['structuredValue']))
            restored['content']['zh'] = old['structuredValue']['content']['zh']
            assert restored == old['structuredValue'] and row['sourceRecord'] == old['sourceRecord']
            assert row['structuredValue']['content']['zh'] == (ROOT / 'content-zh.txt').read_text().rstrip('\n')
            save('cms-review-intent.json', {'id': ID, 'pointer': '/content/zh',
                 'reason': '已逐项核对11/23国服官方定档、福利正文与活动规则，完整差异仅中文正文；不推定开服小时、首日总抽数或正式游戏规则。'})
            request(f'/api/content-records/{ID}?draft=false&locale=all&depth=0&overrideLock=false', token,
                    {'_status': 'published', 'hold': False}, 'PATCH')
            current = doc(token, False)
            assert current['structuredValue'] == row['structuredValue'] and current['_status'] == 'published' and current['hold'] is False
            save('cms-review.json', current)
            save('selection.json', {'stableKeys': [current['stableKey']]})
        elif PHASE == 'verify':
            before = json.loads(gzip.decompress((ROOT / 'cms-before.json.gz').read_bytes()))
            current = {key: all_records(token, key == 'draft') for key in ['draft', 'published']}
            for key in current:
                assert [r for r in current[key] if r['id'] != ID] == [r for r in before[key] if r['id'] != ID]
                assert next(r for r in current[key] if r['id'] == ID) == load('cms-review.json')
            with (ROOT / 'cms-final.json.gz').open('xb') as stream:
                stream.write(gzip.compress(json.dumps(current).encode()))
            save('cms-final-proof.json', {'id': ID, 'records': 2966, 'otherRecordsPreserved': 2965,
                 'soleChangedField': '/structuredValue/content/zh', 'cmsPublished': True, 'sitePublished': False,
                 'snapshotSHA256': hashlib.sha256((ROOT / 'cms-final.json.gz').read_bytes()).hexdigest()})
        print(json.dumps({'phase': PHASE, 'completed': True, 'id': ID}, ensure_ascii=False))
    finally:
        request('/api/users/logout', token, {})
