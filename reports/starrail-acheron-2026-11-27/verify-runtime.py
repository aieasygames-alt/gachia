# -*- coding: utf-8 -*-
import urllib.request,urllib.error,urllib.parse,json,pathlib,sys,re,hashlib,html,concurrent.futures,http.client
from bs4 import BeautifulSoup
root=pathlib.Path(__file__).resolve().parent
label=sys.argv[1];assert label in ['preview','production']
upload=json.loads((root/'runtime-upload.json').read_text())
origin=upload['previewOrigin'] if label=='preview' else 'https://gachia.com'
expected=json.loads((root/('cloud-after.json' if label=='production' else 'cloud-before.json')).read_text())['docs']
if label=='production':assert sorted(expected,key=lambda d:d['slug'])==sorted(json.loads((root/'expected-publication.json').read_text())['docs'],key=lambda d:d['slug'])
client=urllib.request.build_opener(urllib.request.ProxyHandler({'https':'http://127.0.0.1:1087'}))
def req(path,body=None):
 headers={'accept-encoding':'identity','User-Agent':'GachiaCMS/1.0'}
 if body is not None:headers['content-type']='application/json'
 q=urllib.request.Request(origin+path,data=json.dumps(body).encode() if body is not None else None,headers=headers,method='PUT' if body is not None else 'GET')
 for attempt in range(3):
  try:
   with client.open(q,timeout=45) as r:return r.status,r.read(),r.headers
  except urllib.error.HTTPError as e:return e.code,e.read(),e.headers
  except (urllib.error.URLError,http.client.RemoteDisconnected,TimeoutError):
   if attempt==2:raise
   print('Retrying transport read',path,flush=True)
assert req('/api/cms/starrail',{})[0]==401
checks=[];assets=set();revisions=[]
for locale in ['zh','en','ja']:
 s,b,h=req('/api/cms/starrail?locale='+locale);body=json.loads(b);assert s==200 and h.get('cache-control')=='no-store'
 assert sorted(body['docs'],key=lambda d:d['slug'])==sorted([d for d in expected if d['locale']==locale],key=lambda d:d['slug'])
 revisions.append(body['revision'])
 s,b,h=req('/'+locale+'/starrail/version');assert s==200 and h.get('cache-control')=='no-store'
 text=html.unescape(b.decode())
 if locale=='zh':
  assert '已发布更新' in text
  for d in expected:
   assert d['title'] in text and d['summary'] in text and d['boundary'] in text
   assert all(f['text'] in text for f in d['facts'])
 else:assert all(d['title'] not in text for d in expected)
 assets.update(html.unescape(a) for a in re.findall(r'(?:src|href)="(/_next/static/[^"\s]+)"',text))
 (root/(label+'-'+locale+'.html')).write_bytes(b)
 checks.append({'path':'/'+locale+'/starrail/version','status':s,'records':len(body['docs']),'cacheControl':h.get('cache-control')})
assert len(set(revisions))==1
assert revisions[0]==json.loads((root/('cloud-after.json' if label=='production' else 'cloud-before.json')).read_text())['revision']
for p in ['/zh','/en','/ja','/zh/starrail','/zh/starrail/characters','/zh/hi3/weapons','/zh/privacy','/zh/contact','/zh/sea/guides/beginner-guide','/sitemap.xml','/sitemaps/main/sitemap.xml','/ads.txt']:
 s,b,h=req(p);assert s==200,(p,s);checks.append({'path':p,'status':s})
for locale in ['zh','en','ja']:
 for suffix in ['', '/guides/banner-schedule-guide', '/events']:
  p='/'+locale+'/starrail'+suffix
  s,b,h=req(p);text=html.unescape(b.decode());assert s==200 and h.get('cache-control')=='no-store',(p,s,h.get('cache-control'))
  assert '<h1' in text and '4.6正式版本' not in text and '按v4.4 live处理' not in text,p
  if locale=='zh':
   for d in expected:
    if (suffix=='' and d['kind'] in ['version','banner','character']) or (suffix=='/guides/banner-schedule-guide' and d['kind']=='banner') or (suffix=='/events' and d['kind']=='event'):
     assert d['title'] in text,p
     if suffix:assert all(f['text'] in text for f in d['facts']),p
  else:assert all(d['title'] not in text for d in expected),p
  assets.update(html.unescape(a) for a in re.findall(r'(?:src|href)="(/_next/static/[^"\s]+)"',text))
  checks.append({'path':p,'status':s,'cacheControl':h.get('cache-control'),'cmsReader':True})
guideBatch=json.loads((root.parent/'starrail-p0-guides-2026-11-25/batch.json').read_text())['creates']
for d in guideBatch:
 for locale in ['zh','en','ja']:
  p='/'+locale+'/starrail/guides/'+d['slug'];s,b,h=req(p);text=html.unescape(b.decode())
  assert s==200 and h.get('cache-control')=='no-store',(p,s,h.get('cache-control'))
  assert '<h1' in text and 'FAQPage' not in text
  if locale=='zh':
   assert d['title'] in text and d['summary'] in text and d['boundary'] in text,p
   for fact in d['facts']:assert all(paragraph in text for paragraph in fact['text'].split('\n')),p
   for source in d['sources']:assert source['url'] in text,p
   assert '第三方资料' in text
  else:
   assert d['summary'] not in text and 'noindex' in text,p
  assets.update(html.unescape(a) for a in re.findall(r'(?:src|href)="(/_next/static/[^"\s]+)"',text))
  checks.append({'path':p,'status':s,'cacheControl':h.get('cache-control'),'guidePublished':locale=='zh'})
profile=next((d for d in expected if d.get('characterData')),None)
for locale in ['zh','en','ja']:
 for suffix in ['/characters/aha','/characters','/calculator']:
  p='/'+locale+'/starrail'+suffix;s,b,h=req(p);text=html.unescape(b.decode())
  assert s==200 and h.get('cache-control')=='no-store',(p,s,h.get('cache-control'))
  if profile and locale=='zh':
   assert profile['characterData']['name'] in text,p
   if suffix!='/characters':assert '3,308,000' in text and '满月，是神在的时间' in text,p
   if suffix=='/characters/aha':
    for skill in profile['characterData']['skills']:
     for row in skill['levels']:
      assert all(value in text for value in row['values']),p
    assert profile['boundary'] in text and '第三方资料' in text
  else:
   assert '3,308,000' not in text,p
   if suffix=='/characters/aha':assert 'noindex' in text,p
  assets.update(html.unescape(a) for a in re.findall(r'(?:src|href)="(/_next/static/[^"\s]+)"',text))
  checks.append({'path':p,'status':s,'cacheControl':h.get('cache-control'),'characterPublished':bool(profile) and locale=='zh'})
# Verify the newly registered reader before and after its content publication.
yao=next((d for d in expected if d['slug']=='yaoguang-character-data'),None)
for locale in ['zh','en','ja']:
 p='/'+locale+'/starrail/characters/yaoguang';status,body,headers=req(p);text=html.unescape(body.decode())
 assert status==200 and headers.get('cache-control')=='no-store'
 if yao and locale=='zh':
  for value in [yao['title'],yao['summary'],yao['boundary'],*[f['text'] for f in yao['facts']]]:assert value in text,(p,value)
  for skill in yao['characterData']['skills']:
   for row in skill['levels']:assert all(v in text for v in row['values']),p
  for node in yao['characterData']['nodes']:assert node['name'] in text,p
  assert all(source['url'] in text for source in yao['sources'])
  assert '3,308,000' in text and '81.25%' in text
 else:assert 'noindex' in text and '81.25%' not in text and '3,308,000' not in text
 assets.update(html.unescape(a) for a in re.findall(r'(?:src|href)="(/_next/static/[^"\s]+)"',text))
 checks.append({'path':p,'status':status,'cmsCharacterPublished':bool(yao) and locale=='zh','cacheControl':'no-store'})
 status,body,headers=req('/'+locale+'/starrail/characters');page=BeautifulSoup(body,'html.parser')
 assert len(page.select('a[href="/'+locale+'/starrail/characters/yaoguang"]'))==(1 if yao and locale=='zh' else 0)
 assert not page.select('a[href="/'+locale+'/starrail/characters/yao-guang"]')
 status,body,headers=req('/'+locale+'/starrail/calculator');page=BeautifulSoup(body,'html.parser')
 assert len(page.select('option[value="yaoguang"]'))==(1 if yao and locale=='zh' else 0)
 assert not page.select('button img[alt="爻光"]')
# New canonical reader replaces the legacy incomplete form while keeping original Silver Wolf.
sw=next((d for d in expected if d['slug']=='silver-wolf-lv999-character-data'),None)
for locale in ['zh','en','ja']:
 p='/'+locale+'/starrail/characters/silver-wolf-lv999';status,body,headers=req(p);text=html.unescape(body.decode())
 assert status==200 and headers.get('cache-control')=='no-store'
 if sw and locale=='zh':
  for value in [sw['title'],sw['summary'],sw['boundary'],*[f['text'] for f in sw['facts']]]:assert value in text,(p,value)
  for skill in sw['characterData']['skills']:
   for row in skill['levels']:assert all(v in text for v in row['values']),p
  for node in sw['characterData']['nodes']:assert node['name'] in text,p
  assert all(source['url'] in text for source in sw['sources'])
  assert '3,308,000' in text and '纷争先兆' in text
 else:assert 'noindex' in text and '73.125%' not in text and '3,308,000' not in text
 assets.update(html.unescape(a) for a in re.findall(r'(?:src|href)="(/_next/static/[^"\s]+)"',text))
 checks.append({'path':p,'status':status,'cmsCharacterPublished':bool(sw) and locale=='zh','cacheControl':'no-store'})
 status,body,headers=req('/'+locale+'/starrail/characters');page=BeautifulSoup(body,'html.parser')
 assert len(page.select('a[href="/'+locale+'/starrail/characters/silver-wolf-lv999"]'))==(1 if sw and locale=='zh' else 0)
 assert len(page.select('a[href="/'+locale+'/starrail/characters/silver-wolf"]'))==1
 status,body,headers=req('/'+locale+'/starrail/calculator');page=BeautifulSoup(body,'html.parser')
 assert len(page.select('option[value="silver-wolf-lv999"]'))==(1 if sw and locale=='zh' else 0)
 assert not page.select('button img[alt="银狼LV.999"]')
 checks.append({'path':'/'+locale+'/starrail/calculator','status':status,'originalSilverWolfPreserved':True,'cmsFormOnly':True})
# New canonical reader replaces the legacy incomplete form while keeping original Sparkle.
sw=next((d for d in expected if d['slug']=='sparxie-character-data'),None)
for locale in ['zh','en','ja']:
 p='/'+locale+'/starrail/characters/sparxie';status,body,headers=req(p);text=html.unescape(body.decode())
 assert status==200 and headers.get('cache-control')=='no-store'
 if sw and locale=='zh':
  for value in [sw['title'],sw['summary'],sw['boundary'],*[f['text'] for f in sw['facts']]]:assert value in text,(p,value)
  for skill in sw['characterData']['skills']:
   for row in skill['levels']:assert all(v in text for v in row['values']),p
  for node in sw['characterData']['nodes']:assert node['name'] in text,p
  assert all(source['url'] in text for source in sw['sources'])
  assert '3,308,000' in text and '明辉日珥' in text
 else:assert 'noindex' in text and '40.625%' not in text and '3,308,000' not in text
 assets.update(html.unescape(a) for a in re.findall(r'(?:src|href)="(/_next/static/[^"\s]+)"',text))
 checks.append({'path':p,'status':status,'cmsCharacterPublished':bool(sw) and locale=='zh','cacheControl':'no-store'})
 status,body,headers=req('/'+locale+'/starrail/characters');page=BeautifulSoup(body,'html.parser')
 assert len(page.select('a[href="/'+locale+'/starrail/characters/sparxie"]'))==(1 if sw and locale=='zh' else 0)
 assert len(page.select('a[href="/'+locale+'/starrail/characters/sparkle"]'))==1
 status,body,headers=req('/'+locale+'/starrail/calculator');page=BeautifulSoup(body,'html.parser')
 assert len(page.select('option[value="sparxie"]'))==(1 if sw and locale=='zh' else 0)
 assert not page.select('button img[alt="火花"]')
 checks.append({'path':'/'+locale+'/starrail/calculator','status':status,'originalSparklePreserved':True,'cmsFormOnly':True})
# New canonical reader replaces the legacy incomplete form for four-skill Acheron.
sw=next((d for d in expected if d['slug']=='acheron-character-data'),None)
for locale in ['zh','en','ja']:
 p='/'+locale+'/starrail/characters/acheron';status,body,headers=req(p);text=html.unescape(body.decode())
 assert status==200 and headers.get('cache-control')=='no-store'
 if sw and locale=='zh':
  for value in [sw['title'],sw['summary'],sw['boundary'],*[f['text'] for f in sw['facts']]]:assert value in text,(p,value)
  for skill in sw['characterData']['skills']:
   for row in skill['levels']:assert all(v in text for v in row['values']),p
  for node in sw['characterData']['nodes']:assert node['name'] in text,p
  assert all(source['url'] in text for source in sw['sources'])
  assert '3,308,000' in text and '炼形者雷枝' in text
 else:assert 'noindex' in text and '238.08%' not in text and '3,308,000' not in text
 assets.update(html.unescape(a) for a in re.findall(r'(?:src|href)="(/_next/static/[^"\s]+)"',text))
 checks.append({'path':p,'status':status,'cmsCharacterPublished':bool(sw) and locale=='zh','cacheControl':'no-store'})
 status,body,headers=req('/'+locale+'/starrail/characters');page=BeautifulSoup(body,'html.parser')
 assert len(page.select('a[href="/'+locale+'/starrail/characters/acheron"]'))==(1 if sw and locale=='zh' else 0)
 status,body,headers=req('/'+locale+'/starrail/calculator');page=BeautifulSoup(body,'html.parser')
 assert len(page.select('option[value="acheron"]'))==(1 if sw and locale=='zh' else 0)
 assert not page.select('button img[alt="黄泉"]')
 checks.append({'path':'/'+locale+'/starrail/calculator','status':status,'cmsFormOnly':True})
equipment=[*json.loads((root.parent/'starrail-equipment-2026-11-25/batch.json').read_text())['creates'],*json.loads((root.parent/'starrail-warp-cones-2026-11-25/batch.json').read_text())['creates'],*json.loads((root.parent/'starrail-remaining-cones-2026-11-25/batch.json').read_text())['creates']]
def verifyEquipment(locale):
 for category in ['weapons','artifacts']:
  p='/'+locale+'/starrail/'+category;s,b,h=req(p);text=html.unescape(b.decode())
  assert s==200 and h.get('cache-control')=='no-store',p
  for d in equipment:
   if (category=='weapons')!=(d['slug'] not in ['gods-momentary-bliss','subspace-sanctuary']):continue
   published=next((row for row in expected if row['slug']==d['slug'] and row['locale']==locale),None)
   if published:
    assert d['title'] in text and '/starrail/'+category+'/'+d['slug'] in text,p
    assert len(BeautifulSoup(text,'html.parser').select('a[href="/'+locale+'/starrail/'+category+'/'+d['slug']+'"]'))==1,(p,d['slug'],'duplicate card')
   else:
    assert d['summary'] not in text,p
    assert not BeautifulSoup(text,'html.parser').select('a[href="/'+locale+'/starrail/'+category+'/'+d['slug']+'"]'),(p,d['slug'],'unpublished legacy card')
  assets.update(html.unescape(a) for a in re.findall(r'(?:src|href)="(/_next/static/[^"\s]+)"',text))
  checks.append({'path':p,'status':s,'cacheControl':h.get('cache-control'),'equipmentIndex':True})
 for d in equipment:
  category='weapons' if d['slug'] not in ['gods-momentary-bliss','subspace-sanctuary'] else 'artifacts'
  p='/'+locale+'/starrail/'+category+'/'+d['slug'];s,b,h=req(p);text=html.unescape(b.decode())
  assert s==200 and h.get('cache-control')=='no-store',p
  published=next((row for row in expected if row['slug']==d['slug'] and row['locale']==locale),None)
  if published:
   assert d['title'] in text and d['summary'] in text and d['boundary'] in text,p
   for fact in d['facts']:assert all(line in text for line in fact['text'].split('\n')),p
   assert all(source['url'] in text for source in d['sources']),p
   assert '第三方资料' in text
  else:assert d['summary'] not in text and 'noindex' in text,p
  assets.update(html.unescape(a) for a in re.findall(r'(?:src|href)="(/_next/static/[^"\s]+)"',text))
  checks.append({'path':p,'status':s,'cacheControl':h.get('cache-control'),'equipmentPublished':bool(published)})
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(verifyEquipment,['zh','en','ja']))
print('Core readers and equipment routes passed', len(checks), flush=True)
for cid in ['castorice','seele']:
 p='/zh/starrail/characters/'+cid;s,b,h=req(p);text=html.unescape(b.decode());assert s==200 and '星魂第1层效果' not in text,p
 if cid=='castorice':assert '遐蝶' in text and '卡芙卡' not in text
 checks.append({'path':p,'status':s,'placeholderRemoved':True})
materials=[d for d in json.loads((root/'expected-publication.json').read_text())['docs'] if d['kind']=='material']
registry=json.loads((root/'material-registry.json').read_text())
def verifyMaterials(locale):
 p='/'+locale+'/starrail/items';s,b,h=req(p);text=html.unescape(b.decode());assert s==200 and h.get('cache-control')=='no-store',p
 page=BeautifulSoup(text,'html.parser')
 checks.append({'path':p,'status':s,'cacheControl':'no-store','materialIndex':True})
 for d in materials:
  path='/'+locale+'/starrail/items/'+d['slug'];s,b,h=req(path);text=html.unescape(b.decode());assert s==200 and h.get('cache-control')=='no-store',path
  published=any(row['slug']==d['slug'] and row['locale']==locale for row in expected)
  assert len(page.select('a[href="'+path+'"]'))==(1 if published else 0),path
  assert 'FAQPage' not in text,path
  if published:
   assert d['title'] in text and d['summary'] in text and d['boundary'] in text,path
   for f in d['facts']:assert all(line in text for line in f['text'].split('\n')),path
   assert all(source['url'] in text for source in d['sources']),path
   for eid in registry[d['slug']]['equipment']:assert '/'+locale+'/starrail/weapons/'+eid in text,(path,eid)
  else:assert d['summary'] not in text and 'noindex' in text,path
  checks.append({'path':path,'status':s,'cacheControl':'no-store','materialPublished':published})
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(verifyMaterials,['zh','en','ja']))
print('All material readers passed', len(checks), flush=True)
for eid in sorted({eid for r in registry.values() for eid in r['equipment']}):
 p='/zh/starrail/weapons/'+eid;s,b,h=req(p);text=b.decode()
 for d in materials:
  if eid in registry[d['slug']]['equipment']:
   published=any(row['slug']==d['slug'] and row['locale']=='zh' for row in expected)
   assert ('/zh/starrail/items/'+d['slug'] in text)==published,(eid,d['slug'])
 checks.append({'path':p,'status':s,'materialLinksMatchPublication':True})
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):return None
aliasclient=urllib.request.build_opener(urllib.request.ProxyHandler({'https':'http://127.0.0.1:1087'}),NoRedirect())
for locale in ['zh','en','ja']:
 p='/'+locale+'/starrail/weapons/welcome-to-the-cosmic-city'
 q=urllib.request.Request(origin+p,headers={'User-Agent':'GachiaCMS/1.0'})
 try:aliasclient.open(q,timeout=40);raise AssertionError('Alias did not redirect')
 except urllib.error.HTTPError as e:
  assert e.code==308 and e.headers['location'].endswith('/'+locale+'/starrail/weapons/welcome-to-the-galactic-city'),(p,e.code,dict(e.headers))
  assert e.headers.get('cache-control')=='no-store'
 checks.append({'path':p,'status':308,'canonicalSameLocale':True,'cacheControl':'no-store'})
for locale in ['zh','en','ja']:
 p='/'+locale+'/starrail/characters/yao-guang'
 try:aliasclient.open(urllib.request.Request(origin+p,headers={'User-Agent':'GachiaCMS/1.0'}),timeout=40);raise AssertionError('Character alias did not redirect')
 except urllib.error.HTTPError as e:
  assert e.code==308 and e.headers['location'].endswith('/'+locale+'/starrail/characters/yaoguang')
  assert e.headers.get('cache-control')=='no-store'
 checks.append({'path':p,'status':308,'canonicalSameLocale':True,'cacheControl':'no-store'})
for p in ['/data/starrail/raw-materials.json','/data/starrail/raw-light-cones.json','/data-manifest/search-zh.json','/data-manifest/search-en.json','/data-manifest/search-ja.json']:
 s,b,h=req(p);assert s==200 and json.loads(b)==json.loads((root/'artifact/assets'/p.lstrip('/')).read_text()),p
 checks.append({'path':p,'status':s,'compatibilitySnapshotMatches':True})
# Calendar content is absent before CMS publication and exact afterward.
for locale in ['zh','en','ja']:
 p='/'+locale+'/starrail/events';status,body,headers=req(p);text=html.unescape(body.decode());page=BeautifulSoup(text,'html.parser')
 rows=[(d,e) for d in expected if d['locale']==locale for e in d.get('eventSchedule',{}).get('entries',[])]
 assert status==200 and headers.get('cache-control')=='no-store'
 assert len(page.select('[data-event-id]'))==len(rows)
 for d,e in rows:
  cards=page.select('[data-event-id="'+e['id']+'"]');assert len(cards)==1
  card=cards[0];cardtext=card.get_text(' ',strip=True)
  assert all(value in cardtext for value in [e['title'],e['eligibility'],e['note']])
  assert card.select('a[href="'+e['sourceUrl']+'"]') and card.select('a[href="#'+d['slug']+'"]')
  for point in [e['start'],e['end']]:
   if point['kind']=='at':assert point['value'].replace('-','/').replace('T',' ') in cardtext
   if point['kind']=='not-announced':assert '未公告独立结束时间' in cardtext
   if point['kind']=='version-end':assert point['version']+'版本结束前' in cardtext
   if point['kind']=='after-update':assert point['date'].replace('-','/')+' '+point['version']+'版本更新后' in cardtext
 checks.append({'path':p,'status':status,'calendarEntries':len(rows),'announcementTimesWithoutTimezoneInference':True})
def asset(p):
 s,b,h=req(p);assert s==200,(p,s)
 local=(root/'artifact/assets'/urllib.parse.unquote(p.split('?',1)[0]).lstrip('/')).read_bytes()
 assert hashlib.sha256(b).digest()==hashlib.sha256(local).digest(),p
 return {'path':p,'status':s,'sha256':hashlib.sha256(b).hexdigest()}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:assetchecks=list(pool.map(asset,sorted(assets)))
assert json.loads(req('/api/cms/starrail?locale=zh')[1])['revision']==revisions[0], 'Publication changed during readback'
result={'status':'passed','origin':origin,'revision':revisions[0],'checks':checks,'assets':assetchecks,'anonymousWriteRejected':True,'cloudContentWrites':0}
(root/(label+'-acceptance.json')).write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'status':'passed','label':label,'records':len(expected),'routes':len(checks),'assets':len(assetchecks)}))
