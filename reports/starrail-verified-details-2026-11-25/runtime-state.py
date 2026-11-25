import concurrent.futures
import datetime
import json
import pathlib
import re
import sys
import urllib.request

root = pathlib.Path(__file__).resolve().parent
label = sys.argv[1]
assert label in ['before', 'after']
target = root / ('runtime-' + label + '.json')
assert not target.exists(), 'Preserve prior evidence'
text = (pathlib.Path.home() / '.wrangler/config/default.toml').read_text()
token = json.loads(re.search(r'^oauth_token\s*=\s*("[^"\r\n]*")', text, re.M)[1])
api = 'https://api.cloudflare.com/client/v4/accounts/e6472b6c6172a3ac1e1596ef100543ae/workers/scripts/'
client = urllib.request.build_opener(urllib.request.ProxyHandler({'https': 'http://127.0.0.1:1087'}))
services = ['gachia', 'gachia-router', 'gachia-game-genshin', 'gachia-game-nte', 'gachia-game-azur-promilia', 'gachia-game-lvmeng']

def capture(service):
    req = urllib.request.Request(api + service + '/deployments', headers={'Authorization': 'Bearer ' + token})
    with client.open(req, timeout=35) as response:
        data = json.load(response)
    assert data['success']
    latest = max(data['result']['deployments'], key=lambda row: row['created_on'])
    return service, {key: latest[key] for key in ['id', 'created_on', 'versions']}

with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    state = dict(pool.map(capture, services))
if label == 'after':
    before = json.loads((root / 'runtime-before.json').read_text())
    assert state == before['services'], 'Deployment changed during the content update'
target.write_text(json.dumps({'capturedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'services': state}, indent=2) + '\n')
print(json.dumps({'status': 'passed', 'label': label, 'main': state['gachia']['versions'], 'services': len(state)}))
