"""Bounded, read-only supplementation of R136; never a CMS/publication writer."""
import base64, concurrent.futures, datetime, gzip, hashlib, json, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent.parent
DB_COMMIT = '8e5badd60b5d894284ccc927a56c9683529d2592'
GAME_COMMIT = 'bd35e243fa436f141f015cf221a6e19d0c34b7ca'
opener = urllib.request.build_opener(urllib.request.ProxyHandler({'http': 'http://127.0.0.1:1087', 'https': 'http://127.0.0.1:1087'}))

def sha(data): return hashlib.sha256(data).hexdigest()
def git(data): return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
def get(url, limit=4*1024*1024):
    with opener.open(urllib.request.Request(url, headers={'User-Agent': 'Gachia-source-review'}), timeout=35) as response:
        data = response.read(limit+1)
    assert len(data) <= limit, 'Response exceeds bounded budget'
    return data
def store(relative, data):
    file = ROOT/relative
    file.parent.mkdir(parents=True, exist_ok=True)
    if file.exists(): assert file.read_bytes() == data, 'Refuse to overwrite different evidence'
    else: file.write_bytes(data)
    return {'path': relative, 'sha256': sha(data), 'bytes': len(data)}
def save(name, value):
    store(name, (json.dumps(value, ensure_ascii=False, indent=2)+'\n').encode())

parent = json.loads((ROOT.parent/'genshin-recipe-candidates-2026-11-20-r136/delivery.json').read_text())
assert sha((ROOT.parent/'genshin-recipe-candidates-2026-11-20-r136/delivery.json').read_bytes()) == '0ca512f50c3031697cd96096062554ad332d21eba9be7d79d616a0d194550c6a'
candidate_file = Path(parent['candidate']['path'])
assert sha(candidate_file.read_bytes()) == parent['candidate']['pin']
plan = json.loads(candidate_file.read_text())['plan']
specialties = [row for row in plan['proposals'] if row['rarityEvidence'] in ['missing', 'retained-local-unverified']]
assert len(specialties) == 49

def specialty(row):
    numeric = row['numericId']
    url = f'https://gi.yatta.moe/api/v2/en/material/{numeric}'
    file = ROOT/f'yatta/materials/{numeric}.json'
    data = file.read_bytes() if file.exists() else get(url)
    value = json.loads(data)
    assert value['response'] == 200
    item = value['data']
    assert item['icon'] == f'UI_ItemIcon_{numeric}'
    assert item['name'] == row['draft']['nameEn']
    assert isinstance(item['rank'], int) and 1 <= item['rank'] <= 5
    return {'numericId': numeric, 'localId': row['localId'], 'nameEn': item['name'], 'rank': item['rank'],
            'url': url, **store(f'yatta/materials/{numeric}.json', data)}

def database(source_path):
    target = ROOT/'reference'/source_path
    metadata_path = ROOT/'reference-metadata'/source_path
    api = f'https://api.github.com/repos/theBowja/genshin-db/contents/{source_path}?ref={DB_COMMIT}'
    metadata_bytes = metadata_path.read_bytes() if metadata_path.exists() else get(api)
    metadata = json.loads(metadata_bytes)
    assert metadata['path'] == source_path and metadata['type'] == 'file' and metadata['encoding'] == 'base64'
    data = base64.b64decode(metadata['content'])
    assert len(data) == metadata['size'] and git(data) == metadata['sha']
    json.loads(data)
    store('reference-metadata/'+source_path, metadata_bytes)
    return {'sourcePath': source_path, 'url': f'https://raw.githubusercontent.com/theBowja/genshin-db/{DB_COMMIT}/{source_path}',
            'gitBlob': metadata['sha'], **store('reference/'+source_path, data)}

paths = [f'src/data/{locale}/{family}/{key}.json' for key in ['mualani', 'ororon']
         for locale, family in [('ChineseSimplified','characters'),('Japanese','characters'),('ChineseSimplified','talents'),
                                ('English','constellations'),('ChineseSimplified','constellations')]]
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    ranks = list(pool.map(specialty, specialties))
    characters = list(pool.map(database, paths))

metadata = json.loads((ROOT/'game-material-metadata.json').read_text())
assert metadata['path'] == 'ExcelBinOutput/MaterialExcelConfigData.json'
assert f'/{GAME_COMMIT}/' in metadata['download_url']
archive = ROOT/'game/MaterialExcelConfigData.json.gz'
if archive.exists(): game_bytes = gzip.decompress(archive.read_bytes())
else:
    game_bytes = get(metadata['download_url'], 64*1024*1024)
    store('game/MaterialExcelConfigData.json.gz', gzip.compress(game_bytes, mtime=0))
assert len(game_bytes) == metadata['size'] and git(game_bytes) == metadata['sha']
game = json.loads(game_bytes)
ids = {row['numericId'] for row in ranks}
selected = [{'pointer': f'/{i}', 'record': row} for i, row in enumerate(game) if row['id'] in ids]
assert len(selected) == len(ids)
for row in selected:
    match = next(item for item in ranks if item['numericId'] == row['record']['id'])
    # These game records omit rankLevel; their `rank` is a sort order (e.g.
    # 313), not rarity. The API explicitly supplies display rank=1. Record the
    # distinction instead of claiming two sources prove an official star level.
    assert 'rankLevel' not in row['record']
    assert match['rank'] == 1
    match['evidenceMeaning'] = 'community API display rank; game rankLevel absent'
game_proof = {'repository': 'https://github.com/DimbreathBot/AnimeGameData', 'commit': GAME_COMMIT,
              'sourcePath': metadata['path'], 'url': metadata['download_url'], 'gitBlob': metadata['sha'],
              'sha256': sha(game_bytes), 'archive': store('game/MaterialExcelConfigData.json.gz', archive.read_bytes()), 'selected': selected}
save('reference-index.json', {'kind': 'genshin-r137-supplementary-evidence-v1',
    'classification': 'community-maintained API and game-data extraction; not official certification',
    'observedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'parentDelivery': {'path': str(ROOT.parent/'genshin-recipe-candidates-2026-11-20-r136/delivery.json'), 'pin': sha((ROOT.parent/'genshin-recipe-candidates-2026-11-20-r136/delivery.json').read_bytes())},
    'databaseCommit': DB_COMMIT, 'specialtyRanks': ranks, 'characterFiles': characters, 'game': game_proof})
print(json.dumps({'specialties': len(ranks), 'rarities': sorted({row['rank'] for row in ranks}),
    'newCharacterReferenceFiles': len(characters), 'gameFileBytes': len(game_bytes)}, indent=2))
