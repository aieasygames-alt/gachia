# -*- coding: utf-8 -*-
"""Save final canonical cloud publication without exposing publish credentials."""
import pathlib,json,urllib.request,concurrent.futures
r=pathlib.Path(__file__).resolve().parent
client=urllib.request.build_opener(urllib.request.ProxyHandler({'https':'http://127.0.0.1:1087'}))
def one(locale):
 with client.open(urllib.request.Request('https://gachia.com/api/cms/starrail?locale='+locale,headers={'User-Agent':'GachiaCMS/1.0'}),timeout=45) as f:
  assert f.status==200 and f.headers.get('cache-control')=='no-store';return json.load(f)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:rows=list(pool.map(one,['zh','en','ja']))
assert len({v['revision'] for v in rows})==1 and len(rows[0]['docs'])==79 and all(not v['docs'] for v in rows[1:])
expected=json.loads((r/'expected-publication.json').read_text())['docs'];actual=[d for v in rows for d in v['docs']]
assert sorted(actual,key=lambda x:x['slug'])==sorted(expected,key=lambda x:x['slug'])
(r/'cloud-after.json').write_text(json.dumps({'revision':rows[0]['revision'],'docs':actual},ensure_ascii=False,indent=2)+'\n');print('Cloud canonical publication matches79; en/ja empty; revision',rows[0]['revision'])
