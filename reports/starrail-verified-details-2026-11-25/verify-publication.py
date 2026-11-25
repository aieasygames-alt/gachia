import concurrent.futures
import html
import json
import pathlib
import urllib.request

root = pathlib.Path(__file__).resolve().parent
expected = json.loads((root / 'expected-publication.json').read_text())['docs']
before = json.loads((root / 'cloud-before.json').read_text())
origin = 'https://gachia.com'
client = urllib.request.build_opener(urllib.request.ProxyHandler({'https': 'http://127.0.0.1:1087'}))

def get(path):
    req = urllib.request.Request(origin + path, headers={'User-Agent': 'GachiaCMS/1.0', 'accept-encoding': 'identity'})
    with client.open(req, timeout=40) as response:
        return response.status, response.read(), response.headers

def locale_check(locale):
    code, body, headers = get('/api/cms/starrail?locale=' + locale)
    publication = json.loads(body)
    assert code == 200 and headers.get('cache-control') == 'no-store'
    assert publication['revision'] > before['revision']
    assert publication['hasNextPage'] is False
    wanted = [row for row in expected if row['locale'] == locale]
    order = lambda rows: sorted(rows, key=lambda row: row['slug'])
    assert order(publication['docs']) == order(wanted), 'Public content differs from reviewed Payload records'
    code, body, headers = get('/' + locale + '/starrail/version')
    text = html.unescape(body.decode())
    assert code == 200 and headers.get('cache-control') == 'no-store'
    if locale == 'zh':
        assert '已发布更新' in text
        for row in wanted:
            assert row['title'] in text, row['slug']
            assert row['summary'] in text, row['slug']
            assert all(fact['text'] in text for fact in row['facts']), row['slug']
            assert row['region'] in text and row['boundary'] in text, row['slug']
    else:
        assert all(row['title'] not in text for row in expected)
    (root / ('production-' + locale + '.html')).write_bytes(body)
    return {'locale': locale, 'status': code, 'revision': publication['revision'], 'records': len(wanted), 'cacheControl': headers.get('cache-control'), 'allReviewedTextRendered': True}

with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    checks = list(pool.map(locale_check, ['zh', 'en', 'ja']))
assert len({row['revision'] for row in checks}) == 1
smoke = []
for path in ['/zh', '/zh/starrail', '/zh/starrail/characters']:
    code, body, headers = get(path)
    assert code == 200
    smoke.append({'path': path, 'status': code})
result = {'status': 'passed', 'origin': origin, 'previousRevision': before['revision'], 'revision': checks[0]['revision'], 'locales': checks, 'smoke': smoke, 'contentWrites': 0, 'workerDeployments': 0}
(root / 'production-acceptance.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))
