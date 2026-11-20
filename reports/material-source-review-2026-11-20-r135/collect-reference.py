"""Read-only, commit-pinned corroboration; never an official approval or CMS writer."""
import concurrent.futures, hashlib, json, re, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent.parent
COMMIT = '8e5badd60b5d894284ccc927a56c9683529d2592'
tree = json.loads((ROOT/'reference-tree.json').read_text())
entries = {row['path']: row for row in tree['tree']}
proxy = urllib.request.ProxyHandler({'http': 'http://127.0.0.1:1087', 'https': 'http://127.0.0.1:1087'})
client = urllib.request.build_opener(proxy)
def normalized(text): return re.sub('[^a-z0-9]', '', text.lower())
rows = json.loads((REPO/'packages/data/games/genshin/raw-character-materials.json').read_text())
characters = {c['id']: c for c in json.loads((REPO/'packages/data/games/genshin/raw-characters.json').read_text())}
filenames = {}
for row in rows:
    identity = row['characterId']
    key = normalized(characters.get(identity, {}).get('nameEn', identity))
    key = {'sara': 'kujousara', 'shinobu': 'kukishinobu'}.get(key, key)
    assert f'src/data/English/characters/{key}.json' in entries, key
    filenames[identity] = key
paths = {f'src/data/English/{family}/{key}.json' for key in filenames.values() for family in ['characters', 'talents']}
for locale in ['English','ChineseSimplified']:
    paths.update(f'src/data/{locale}/materials/{key}.json' for key in ['callalily','onikabuto','slimecondensate'])
    paths.update(f'src/data/{locale}/characters/{key}.json' for key in ['kujousara','kukishinobu'])
paths.add('LICENSE')
def fetch(p):
    assert p in entries, p
    target = ROOT/'reference'/p
    url = f'https://raw.githubusercontent.com/theBowja/genshin-db/{COMMIT}/{p}'
    if target.exists(): data = target.read_bytes()
    else:
        with client.open(url, timeout=35) as res: data = res.read(1024*1024)
        assert len(data) == entries[p]['size'], p
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    blob = hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
    assert blob == entries[p]['sha'], p
    if p.endswith('.json'): json.loads(data)
    return {'sourcePath': p, 'url': url, 'gitBlob': blob, 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)}
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    proofs = list(pool.map(fetch, sorted(paths)))
# Include every material identified by the cost source, without downloading unrelated game data.
cost_materials = {}
for key in filenames.values():
    for family in ['characters','talents']:
        value = json.loads((ROOT/f'reference/src/data/English/{family}/{key}.json').read_text())
        for cost in value['costs'].values():
            for material in cost:
                name = material['name']; filename = normalized(name)
                p = f'src/data/English/materials/{filename}.json'
                assert p in entries, (name, p)
                if material['id'] in cost_materials: assert cost_materials[material['id']] == filename
                cost_materials[material['id']] = filename
extra = {f'src/data/{locale}/materials/{key}.json' for locale in ['English','ChineseSimplified'] for key in cost_materials.values()}
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    proofs += list(pool.map(fetch, sorted(extra-paths)))
result = {'repository': 'https://github.com/theBowja/genshin-db', 'commit': COMMIT,
          'classification': 'community-maintained corroboration; not official approval',
          'treeTruncated': tree.get('truncated'), 'allRequestedGitBlobsVerified': True,
          'characterFiles': filenames, 'materialFilesByNumericId': cost_materials,
          'files': sorted(proofs, key=lambda p:p['sourcePath'])}
(ROOT/'reference-index.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({'files':len(proofs),'characters':len(filenames),'costMaterials':len(cost_materials),'bytes':sum(p['bytes'] for p in proofs)}))
