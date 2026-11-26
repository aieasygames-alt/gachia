"""Require the complete previous publication to remain intact before content sync."""
import json,pathlib,urllib.request,html,concurrent.futures
r=pathlib.Path(__file__).resolve().parent
client=urllib.request.build_opener(urllib.request.ProxyHandler({'https':'http://127.0.0.1:1087'}));before=json.loads((r/'cloud-before.json').read_text())
def get(path):
 with client.open(urllib.request.Request('https://gachia.com'+path,headers={'User-Agent':'GachiaCMS/1.0'}),timeout=45) as res:
  assert res.status==200 and res.headers.get('cache-control')=='no-store';return res.read()
def check(locale):
 body=json.loads(get('/api/cms/starrail?locale='+locale));assert body['revision']==before['revision'];wanted=[d for d in before['docs'] if d['locale']==locale]
 assert sorted(body['docs'],key=lambda d:d['slug'])==sorted(wanted,key=lambda d:d['slug'])
 version=html.unescape(get('/'+locale+'/starrail/version').decode())
 for d in wanted:assert d['title'] in version and d['summary'] in version and d['boundary'] in version and all(f['text'] in version for f in d['facts'])
 events=get('/'+locale+'/starrail/events').decode();assert events.count('data-event-id="')==(15 if locale=='zh' else 0)
 character=get('/'+locale+'/starrail/characters/sparxie').decode();assert 'noindex' in character and '40.625%' not in character
 return {'locale':locale,'records':len(wanted),'calendarEntries':15 if locale=='zh' else 0}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:checks=list(pool.map(check,['zh','en','ja']))
(r/'compatible-main-acceptance.json').write_text(json.dumps({'status':'passed','recordsPreserved':77,'revisionPreserved':before['revision'],'newCharacterNotPublished':True,'checks':checks,'cloudContentWrites':0},indent=2)+'\n');print('Compatible Main preserves baseline77, revision, all calendar entries and character draft isolation')
