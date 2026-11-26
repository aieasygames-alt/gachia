# -*- coding: utf-8 -*-
"""Read back the complete anonymous cloud publication without mutating it."""
import json,pathlib,urllib.request

root=pathlib.Path(__file__).resolve().parent
receipt=json.loads((root/'sync-receipt.json').read_text())
assert receipt['ok'] and receipt['count']==71
client=urllib.request.build_opener(urllib.request.ProxyHandler({'https':'http://127.0.0.1:1087'}))
request=urllib.request.Request('https://gachia.com/api/cms/starrail?locale=zh',headers={'User-Agent':'GachiaCMS/1.0'})
with client.open(request,timeout=45) as response:
    assert response.status==200 and response.headers.get('cache-control')=='no-store'
    actual=json.load(response)
assert actual['revision']==receipt['revision']
assert len(actual['docs'])==71
expected=json.loads((root/'expected-publication.json').read_text())['docs']
assert sorted(actual['docs'],key=lambda row:row['slug'])==sorted(expected,key=lambda row:row['slug'])
with (root/'cloud-after.json').open('x') as output:
    json.dump(actual,output,ensure_ascii=False,indent=2);output.write('\n')
print('Cloud publication exactly matches all 71 reviewed records; revision',actual['revision'])
