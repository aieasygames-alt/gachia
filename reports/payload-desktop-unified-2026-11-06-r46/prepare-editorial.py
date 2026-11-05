"""Reopen the approved installed record and pin both the export and exact-CI frozen source."""
import hashlib
import json
import os
from pathlib import Path
import subprocess

os.umask(0o077)
report = Path(__file__).resolve().parent
repo = report.parents[1]
root = Path.home() / 'Library/Application Support/GachiaCMS'
sha = lambda file: hashlib.sha256(file.read_bytes()).hexdigest()
ci = json.loads((report / 'github-code-result.json').read_text())
assert ci['status'] == 'completed' and ci['conclusion'] == 'success'
assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo, text=True).strip() == ci['headSha']
assert not subprocess.check_output(['git', 'status', '--porcelain', '-uno'], cwd=repo, text=True).strip()
assert json.loads((report / 'cms-edit-result.json').read_text())['status'] == 'cms_approved_not_website_activated'
selection, active = report / 'selection-ananta.json', report / 'baseline-release/active.json'
baseline = json.loads((report / 'baseline-release/manifest.json').read_text())
assert sha(active) == baseline['activePin'] and baseline['codeCommit'] == ci['headSha']
common = ['--repo', str(repo), '--pin', '03ad336434e125bad1cbe56ab17319227c9e5e344bfe6344dc29e30451c5cb0d',
    '--selection', str(selection), '--selection-pin', sha(selection), '--active', str(active), '--active-pin', sha(active)]
results = {}
for action in ['export', 'freeze']:
    command = ['python3', str(root / 'desktop.py'), 'unified-' + action, *common]
    if action == 'freeze':
        command += ['--commit', ci['headSha'], '--output', str(report / 'frozen-ananta-01')]
    with (report / f'editorial-{action}.log').open('x') as log:
        subprocess.run(command, cwd=repo, stdout=log, stderr=subprocess.STDOUT, check=True, timeout=180)
    lines = (report / f'editorial-{action}.log').read_text().splitlines()
    result = json.loads(next(line for line in reversed(lines) if line.startswith('{')))
    assert result['preview'] is False and result['cloudWrites'] is False and result['activationSupported'] is False
    assert result['cmsMode'] == 'desktop' and len(result['changed']) == 1
    results[action] = result
assert results['export']['candidateSHA256'] == results['freeze']['candidateSHA256']
assert results['export']['reviewPin'] == results['freeze']['reviewPin']
manifest = json.loads((Path(results['freeze']['directory']) / 'manifest.json').read_text())
result = {'status': 'reviewed_candidate_frozen_not_published', 'sourceCommit': ci['headSha'],
    'selectionPin': sha(selection), 'activePin': sha(active), 'results': results,
    'games': manifest['games'], 'owners': manifest['owners'], 'changed': manifest['candidate']['changed'],
    'preservationOverlayFiles': [row['sourcePath'] for row in manifest['candidate']['files']],
    'productionPromoted': False, 'cloudWrites': False}
with (report / 'editorial-preparation.json').open('x') as stream:
    json.dump(result, stream, indent=2)
    stream.write('\n')
print(json.dumps(result, indent=2))
