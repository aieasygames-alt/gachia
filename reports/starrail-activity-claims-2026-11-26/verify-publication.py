import concurrent.futures
import html
import json
import pathlib
import re
import urllib.request

root = pathlib.Path(__file__).resolve().parent
expected = json.loads((root / 'expected-publication.json').read_text())['docs']
before = json.loads((root / 'cloud-before.json').read_text())
receipt = json.loads((root / 'sync-receipt.json').read_text())
assert receipt['ok'] and receipt['count'] == 73
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
    assert publication['revision'] == receipt['revision']
    assert publication['hasNextPage'] is False
    wanted = [row for row in expected if row['locale'] == locale]
    order = lambda rows: sorted(rows, key=lambda row: row['slug'])
    assert order(publication['docs']) == order(wanted), 'Public content differs from reviewed Payload records'
    if locale == 'zh':
        if (root / 'cloud-after.json').exists():
            assert json.loads((root / 'cloud-after.json').read_text()) == publication
        else:
            with (root / 'cloud-after.json').open('x') as output:
                json.dump(publication, output, ensure_ascii=False, indent=2)
                output.write('\n')
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
    code, event_body, headers = get('/' + locale + '/starrail/events')
    assert code == 200 and headers.get('cache-control') == 'no-store'
    text = html.unescape(event_body.decode())
    cards = dict(re.findall(r'<article[^>]*data-event-id="([^"]+)"[^>]*>(.*?)</article>', text, re.S))
    entries = [(entry, row) for row in wanted for entry in row.get('eventSchedule', {}).get('entries', [])]
    assert len(cards) == len(entries)
    assert len(re.findall(r'data-event-id="', text)) == len(entries)
    def printed(value):
        return value.replace('-', '/').replace('T', ' ')
    for entry, parent in entries:
        card = cards[entry['id']]
        for field in ['title', 'eligibility', 'note', 'sourceUrl']:
            assert entry[field] in card, (entry['id'], field)
        assert f'href="#{parent["slug"]}"' in card
        assert f'id="{parent["slug"]}"' in text
        start, end = entry['start'], entry['end']
        assert (printed(start['value']) if start['kind'] == 'at' else printed(start['date']) + ' ' + start['version'] + '版本更新后') in card
        assert (printed(end['value']) if end['kind'] == 'at' else end['version'] + '版本结束前' if end['kind'] == 'version-end' else '未公告独立结束时间') in card
    for row in wanted:
        if row['kind'] == 'event':
            assert row['title'] in text and row['summary'] in text and row['boundary'] in text
            assert all(fact['text'] in text for fact in row['facts']), row['slug']
    if locale != 'zh':
        assert 'data-event-calendar="cn"' not in text
        assert all(row['title'] not in text for row in expected if row['kind'] == 'event')
    (root / ('events-' + locale + '.html')).write_bytes(event_body)
    return {'locale': locale, 'status': code, 'revision': publication['revision'], 'records': len(wanted), 'calendarEntries': len(entries), 'cacheControl': headers.get('cache-control'), 'allReviewedTextRendered': True, 'calendarFieldsSourcesAndAnchorsVerified': True}

with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    checks = list(pool.map(locale_check, ['zh', 'en', 'ja']))
assert len({row['revision'] for row in checks}) == 1
smoke = []
for path in ['/zh', '/zh/starrail', '/zh/starrail/characters', '/zh/starrail/characters/aha', '/zh/starrail/calculator', '/zh/starrail/weapons', '/zh/starrail/artifacts', '/zh/starrail/items']:
    code, body, headers = get(path)
    assert code == 200
    smoke.append({'path': path, 'status': code})
result = {'status': 'passed', 'origin': origin, 'previousRevision': before['revision'], 'revision': checks[0]['revision'], 'locales': checks, 'smoke': smoke, 'contentWrites': 0, 'workerDeployments': 0}
(root / 'production-acceptance.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))
