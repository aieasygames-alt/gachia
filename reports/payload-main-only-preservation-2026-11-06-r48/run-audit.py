"""Fixed credential-private audit/preview attempt. No promotion or retry entry."""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import urllib.request

parser = argparse.ArgumentParser()
parser.add_argument('--action', choices=['audit-local', 'audit', 'upload-previews'], required=True)
parser.add_argument('--run', type=int, required=True)
parser.add_argument('--attempt', type=int, default=1)
args = parser.parse_args()
assert 1 <= args.attempt <= 99 and (args.action != 'upload-previews' or args.attempt == 1), 'No upload retry entry'
os.umask(0o077)
report = Path(__file__).resolve().parent
repo = report.parents[1]
root = Path.home() / 'Library/Application Support/GachiaCMS'
sha = lambda file: hashlib.sha256(file.read_bytes()).hexdigest()
if args.action != 'audit-local':
    run = json.loads(subprocess.check_output(['gh', 'run', 'view', str(args.run), '--json', 'headSha,status,conclusion'], cwd=repo, text=True))
    assert run['status'] == 'completed' and run['conclusion'] == 'success'
    assert run['headSha'] == subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo, text=True).strip()
request = json.loads((repo / 'reports/payload-unified-production-2026-11-06-r47/cloud-request.json').read_text())
request.update(executorRunID=args.run, preservation={'path': str(report / 'preservation-selection.json'), 'pin': sha(report / 'preservation-selection.json')})
prefix = args.action + (f'-{args.attempt:02}' if args.attempt > 1 else '')
request_file = report / (prefix + '-request.json')
output = report / (prefix + '.json')
log_file = report / (prefix + '.log')
assert not any(file.exists() for file in [request_file, output, log_file]), 'One attempt only; reconcile an existing attempt without retry'
extra = []
if args.action == 'upload-previews':
    audit = json.loads((report / 'audit.json').read_text())
    assert audit['status'] == 'production_preview_preflight_passed_no_upload'
    assert audit['ownerOrder'] == ['main'] and audit['scopeClosureRequired'] is False
    assert audit['executorCI']['runID'] == args.run
    extra = ['--release-key', audit['releaseKey']]
with request_file.open('x') as stream:
    json.dump(request, stream, indent=2)
    stream.write('\n')
env = os.environ.copy()
if args.action != 'audit-local':
    auth = json.loads(subprocess.check_output(['/opt/homebrew/bin/python3', '-c',
        'import json,tomllib,sys; json.dump(tomllib.loads(sys.stdin.read()),sys.stdout)'],
        input=(Path.home() / '.wrangler/config/default.toml').read_text(), text=True))
    expiry = datetime.datetime.fromisoformat(auth['expiration_time'].replace('Z', '+00:00'))
    assert (expiry - datetime.datetime.now(datetime.timezone.utc)).total_seconds() > (30 if args.action == 'upload-previews' else 15) * 60, 'Credential headroom required; no automatic refresh'
    env['CLOUDFLARE_API_TOKEN'] = auth['oauth_token']

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
    env['GACHIA_CMS_REVIEW_TOKEN'] = login['token']
    with log_file.open('x') as log:
        subprocess.run(['pnpm', 'exec', 'tsx', 'scripts/unified-production.ts', args.action, '--request', str(request_file),
            '--pin', sha(request_file), '--output', str(output), *extra], cwd=repo / 'services/content-cms', env=env,
            stdout=log, stderr=subprocess.STDOUT, check=True, timeout=3600)
finally:
    with client.open(urllib.request.Request(base + '/api/users/logout', data=b'{}', method='POST',
            headers={'Content-Type': 'application/json', 'Origin': base, 'Authorization': 'JWT ' + login['token']}), timeout=30) as response:
        assert response.status == 200
result = json.loads(output.read_text())
print(json.dumps({'status': result['status'], 'owners': result.get('ownerOrder'), 'preservationCatalogsVerified': result.get('preservationCatalogsVerified'),
    'productionPromoted': result['productionPromoted'], 'output': str(output)}))
