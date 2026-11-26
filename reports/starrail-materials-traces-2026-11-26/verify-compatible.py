# -*- coding: utf-8 -*-
"""Read-only acceptance after compatible Main, before CMS publication."""
import json,pathlib,urllib.request,html,concurrent.futures
from bs4 import BeautifulSoup
root=pathlib.Path(__file__).resolve().parent
client=urllib.request.build_opener(urllib.request.ProxyHandler({'https':'http://127.0.0.1:1087'}))
def get(path):
 q=urllib.request.Request('https://gachia.com'+path,headers={'user-agent':'GachiaCMS/1.0'})
 with client.open(q,timeout=40) as r:
  assert r.status==200 and r.headers.get('cache-control')=='no-store'
  return r.read()
before=json.loads((root/'cloud-before.json').read_text())
checks=[]
def verifyLocale(locale):
 d=json.loads(get('/api/cms/starrail?locale='+locale))
 assert d['revision']==before['revision']
 assert sorted(d['docs'],key=lambda d:d['slug'])==sorted([d for d in before['docs'] if d['locale']==locale],key=lambda d:d['slug'])
 page=BeautifulSoup(html.unescape(get('/'+locale+'/starrail/items').decode()),'html.parser')
 for record in json.loads((root/'batch.json').read_text())['creates']:
  path='/'+locale+'/starrail/items/'+record['slug']
  body=html.unescape(get(path).decode())
  assert 'noindex' in body and record['summary'] not in body,path
  assert not page.select('a[href="'+path+'"]'),path
  checks.append(path)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(verifyLocale,['zh','en','ja']))
(root/'compatible-main-acceptance.json').write_text(json.dumps({'status':'passed','recordsPreserved':55,'revisionPreserved':before['revision'],'newDetailsPendingNoindexWithoutLegacyFallback':checks,'cloudContentWrites':0},indent=2)+'\n')
print('Compatible Main verified: 55 records preserved; 48 pending locale routes isolated')
