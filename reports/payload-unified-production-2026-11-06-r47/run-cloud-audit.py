"""After exact CI, renew source identity through the fixed GET-only preflight; never upload."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.request

assert len(sys.argv) == 3 and sys.argv[1] == '--run' and sys.argv[2].isdigit()
os.umask(0o077)
report = Path(__file__).resolve().parent
repo = report.parents[1]
root = Path.home() / 'Library/Application Support/GachiaCMS'
sha = lambda file: hashlib.sha256(file.read_bytes()).hexdigest()
run = json.loads(subprocess.check_output(['gh', 'run', 'view', sys.argv[2], '--json', 'headSha,status,conclusion'], cwd=repo, text=True))
assert run['status'] == 'completed' and run['conclusion'] == 'success'
assert run['headSha'] == subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo, text=True).strip()
request = json.loads((report / 'local-request-03.json').read_text())
request['executorRunID'] = int(sys.argv[2])
request_file = report / 'cloud-request.json'
with request_file.open('x') as stream:
    json.dump(request, stream, indent=2)
    stream.write('\n')
auth = json.loads(subprocess.check_output(['/opt/homebrew/bin/python3', '-c',
    'import json,tomllib,sys; json.dump(tomllib.loads(sys.stdin.read()),sys.stdout)'],
    input=(Path.home() / '.wrangler/config/default.toml').read_text(), text=True))
expiry = datetime.datetime.fromisoformat(auth['expiration_time'].replace('Z', '+00:00'))
assert (expiry - datetime.datetime.now(datetime.timezone.utc)).total_seconds() > 15 * 60, 'Credential headroom required; audit does not refresh credentials'

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
    env.update(GACHIA_CMS_REVIEW_TOKEN=login['token'], CLOUDFLARE_API_TOKEN=auth['oauth_token'])
    with (report / 'cloud-audit.log').open('x') as log:
        subprocess.run(['pnpm', 'exec', 'tsx', 'scripts/unified-production.ts', 'audit', '--request', str(request_file),
            '--pin', sha(request_file), '--output', str(report / 'cloud-audit.json')], cwd=repo / 'services/content-cms', env=env,
            stdout=log, stderr=subprocess.STDOUT, check=True, timeout=600)
finally:
    with client.open(urllib.request.Request(base + '/api/users/logout', data=b'{}', method='POST',
            headers={'Content-Type': 'application/json', 'Origin': base, 'Authorization': 'JWT ' + login['token']}), timeout=30) as response:
        assert response.status == 200
result = json.loads((report / 'cloud-audit.json').read_text())
assert result['status'] == 'production_preview_preflight_passed_no_upload'
print(json.dumps({'status': result['status'], 'releaseKey': result['releaseKey'], 'owners': result['ownerOrder'],
    'cloudWrites': False, 'productionPromoted': False}))
