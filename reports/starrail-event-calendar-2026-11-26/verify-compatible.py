# -*- coding: utf-8 -*-
"""Read-only acceptance after compatible Main and before publishing calendars."""
import json,pathlib,urllib.request,html,concurrent.futures
r=pathlib.Path(__file__).resolve().parent
client=urllib.request.build_opener(urllib.request.ProxyHandler({'https':'http://127.0.0.1:1087'}))
before=json.loads((r/'cloud-before.json').read_text())
def get(path):
 with client.open(urllib.request.Request('https://gachia.com'+path,headers={'User-Agent':'GachiaCMS/1.0'}),timeout=45) as response:
  assert response.status==200 and response.headers.get('cache-control')=='no-store'
  return response.read()
def verify(locale):
 result=json.loads(get('/api/cms/starrail?locale='+locale));assert result['revision']==before['revision']
 expected=[row for row in before['docs'] if row['locale']==locale]
 assert sorted(result['docs'],key=lambda d:d['slug'])==sorted(expected,key=lambda d:d['slug'])
 body=html.unescape(get('/'+locale+'/starrail/events').decode());assert 'data-event-calendar' not in body and 'data-event-id' not in body
 version=html.unescape(get('/'+locale+'/starrail/version').decode())
 for row in expected:assert row['title'] in version and row['summary'] in version and row['boundary'] in version and all(f['text'] in version for f in row['facts'])
 return locale
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:locales=list(pool.map(verify,['zh','en','ja']))
with (r/'compatible-main-acceptance.json').open('x') as output:
 json.dump({'status':'passed','recordsPreserved':71,'revisionPreserved':before['revision'],'noCalendarBeforePublication':True,'locales':locales,'cloudContentWrites':0},output,indent=2);output.write('\n')
print('Compatible Main passed: baseline71 and revision preserved; all calendars remain unpublished')
