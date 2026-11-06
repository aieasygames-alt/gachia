"""Reuse the real candidate build for local compatible recovery and exact-module sealing."""
import hashlib
import json
import os
from pathlib import Path
import subprocess

os.umask(0o077)
report = Path(__file__).resolve().parent
repo = report.parents[1]
sha = lambda file: hashlib.sha256(file.read_bytes()).hexdigest()
frozen = report / 'frozen-ananta-01'
build_pin = '15b074cb7a9e68f5645e479ae305bfd4e56d6b9f28f1fa1b6de6ba38b7ee7a74'
assert sha(frozen / 'build.json') == build_pin
build = json.loads((frozen / 'build.json').read_text())
assert build['preview'] is False and build['cloudWrites'] is False
prior_path = repo / 'reports/payload-unified-recovery-2026-11-05-r43/previous-03.json'
assert sha(prior_path) == '04831bca8bb99d721617cb2ab9841f083555ca9eea447028f49086fefb72a773'
previous = json.loads(prior_path.read_text())
previous['owners'] = {owner: previous['owners'][owner] for owner in build['owners']}

def save(name, value):
    with (report / name).open('x') as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2)
        stream.write('\n')

save('previous-three.json', previous)
baseline = json.loads((report / 'consumer-expectations.json').read_text())
for row in baseline:
    if row['owner'] == 'main' and row['path'].startswith('/zh/'):
        row['contains'] = ['无限大下载与配置准备', '切换平台前先确认跨平台存档和账号绑定规则。']
save('baseline-expectations.json', baseline)

def command(name, alias, args):
    with (report / (name + '.log')).open('x') as log:
        subprocess.run(['pnpm', '--dir', 'services/content-cms', alias, *args], cwd=repo,
            stdout=log, stderr=subprocess.STDOUT, check=True, timeout=600)
    lines = (report / (name + '.log')).read_text().splitlines()
    return json.loads(next(line for line in reversed(lines) if line.startswith('{')))

accepted = command('independent-owner-verification', 'unified:verify-local', ['--directory', str(frozen), '--pin', build_pin])
save('independent-owner-verification.json', accepted)
publication = command('local-publication-prepare', 'unified:publication-local', ['prepare', '--build', str(frozen), '--build-pin', build_pin,
    '--previous', str(report / 'previous-three.json'), '--previous-pin', sha(report / 'previous-three.json'),
    '--baseline', str(report / 'baseline-expectations.json'), '--output', str(report / 'compatibility-01')])
assert publication['preview'] is False and publication['cloudWrites'] is False and publication['activationSupported'] is False
save('local-publication.json', publication)
verified = command('independent-publication-verification', 'unified:publication-local', ['verify', '--directory', publication['directory'], '--pin', publication['publicationPin']])
assert verified['publicationPin'] == publication['publicationPin']
transport = command('local-transport-prepare', 'unified:transport-local', ['prepare', '--publication', publication['directory'],
    '--publication-pin', publication['publicationPin'], '--output', str(report / 'transport-01')])
assert transport['preview'] is False and transport['cloudWrites'] is False and transport['activationSupported'] is False
save('local-transport.json', transport)
verified = command('independent-transport-verification', 'unified:transport-local', ['verify', '--directory', transport['directory'], '--pin', transport['transportPin']])
assert verified['transportPin'] == transport['transportPin']
print(json.dumps({'status': 'real_candidate_and_compatible_recovery_locally_sealed_not_published',
    'publication': publication, 'transport': transport, 'cloudWrites': False}, indent=2))
