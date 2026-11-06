"""Recheck the real resident review and sealed candidate without cloud credentials."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.request

os.umask(0o077)
assert sys.argv[1:] == [] or len(sys.argv) == 3 and sys.argv[1] == '--attempt' and re.fullmatch(r'[0-9]{2}', sys.argv[2])
suffix = '' if len(sys.argv) == 1 else '-' + sys.argv[2]
report = Path(__file__).resolve().parent
repo = report.parents[1]
prior = repo / 'reports/payload-desktop-unified-2026-11-06-r46'
root = Path.home() / 'Library/Application Support/GachiaCMS'
sha = lambda file: hashlib.sha256(file.read_bytes()).hexdigest()
proof = lambda file, pin: {'path': str(file), 'pin': pin}
stage = json.loads((prior / 'staged-app.json').read_text())
request = {'schemaVersion': 1, 'kind': 'unified_production_preview_request', 'repo': str(repo),
    'localPreview': proof(prior / 'preview-01/preview.json', 'bfa4097e1983e8395b5acf0c8b3cf160684a305463ebe03f7f2dcc675a639bea'),
    'editorial': proof(prior / 'frozen-ananta-01/editorial.json', '17783e61701491d5ff2ab06c90c1f875da1546d6a34be75d46d5da8a1cf99c94'),
    'selection': proof(prior / 'selection-ananta.json', 'aaa4b364a4f1d144303b13633ce95a61019f4008f23a8ddc9cdffbdfd58b7c59'),
    'active': proof(prior / 'baseline-release/active.json', '771e4008b0b3bba170d69503e9bbf60b1ee47d39d94671d25fc3d903324ecd65'),
    'application': proof(Path(stage['manifestPath']), '5c7780e844cba0e28b20a26f072ff48a50f59e56aca90d0ba24a404a5ebb0afc'),
    'sourceHandoff': proof(repo / 'reports/payload-unified-preview-2026-11-05-r45/source-handoff.json', '1d6cc3da8fba81760f7d89ad58731a5b939769086c563b8f4ca2499e486146d8'),
    'sourceRunID': 42130525825, 'executorRunID': 42130525825}
for field in ['localPreview', 'editorial', 'selection', 'active', 'application', 'sourceHandoff']:
    assert sha(Path(request[field]['path'])) == request[field]['pin']
request_file = report / ('local-request' + suffix + '.json')
with request_file.open('x') as stream:
    json.dump(request, stream, indent=2)
    stream.write('\n')

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise RuntimeError('Redirect forbidden')

client = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
base = 'http://127.0.0.1:3100'
credentials = (root / 'initial-admin.txt').read_text()
login_body = {'email': re.search(r'^Email: (.+)$', credentials, re.M)[1],
    'password': re.search(r'^Password: (.+)$', credentials, re.M)[1]}
with client.open(urllib.request.Request(base + '/api/users/login', data=json.dumps(login_body).encode(),
        headers={'Content-Type': 'application/json', 'Origin': base}, method='POST'), timeout=30) as response:
    login = json.load(response)
assert login['user']['role'] in ['admin', 'reviewer']
try:
    env = os.environ.copy()
    env['GACHIA_CMS_REVIEW_TOKEN'] = login['token']
    env.pop('CLOUDFLARE_API_TOKEN', None)
    with (report / ('local-audit' + suffix + '.log')).open('x') as log:
        subprocess.run(['pnpm', 'exec', 'tsx', 'scripts/unified-production.ts', 'audit-local', '--request', str(request_file),
            '--pin', sha(request_file), '--output', str(report / ('local-audit' + suffix + '.json'))], cwd=repo / 'services/content-cms', env=env,
            stdout=log, stderr=subprocess.STDOUT, check=True, timeout=300)
finally:
    with client.open(urllib.request.Request(base + '/api/users/logout', data=b'{}', method='POST',
            headers={'Content-Type': 'application/json', 'Origin': base, 'Authorization': 'JWT ' + login['token']}), timeout=30) as response:
        assert response.status == 200
result = json.loads((report / ('local-audit' + suffix + '.json')).read_text())
assert result['status'] == 'local_editorial_seal_reverified_not_cloud_authorized'
print(json.dumps({'status': result['status'], 'reviewPin': result['reviewPin'], 'scope': result['scope'], 'cloudWrites': False}))
