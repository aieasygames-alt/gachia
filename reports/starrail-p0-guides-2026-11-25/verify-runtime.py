import urllib.request,urllib.error,urllib.parse,json,pathlib,sys,re,hashlib,html,concurrent.futures,http.client
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
guideBatch=json.loads((root/'batch.json').read_text())['creates']
for d in guideBatch:
 for locale in ['zh','en','ja']:
  p='/'+locale+'/starrail/guides/'+d['slug'];s,b,h=req(p);text=html.unescape(b.decode())
  assert s==200 and h.get('cache-control')=='no-store',(p,s,h.get('cache-control'))
  assert '<h1' in text and 'FAQPage' not in text
  if label=='production' and locale=='zh':
   assert d['title'] in text and d['summary'] in text and d['boundary'] in text,p
   for fact in d['facts']:assert all(paragraph in text for paragraph in fact['text'].split('\n')),p
   for source in d['sources']:assert source['url'] in text,p
   assert '第三方资料' in text
  else:
   assert d['summary'] not in text and 'noindex' in text,p
  assets.update(html.unescape(a) for a in re.findall(r'(?:src|href)="(/_next/static/[^"\s]+)"',text))
  checks.append({'path':p,'status':s,'cacheControl':h.get('cache-control'),'guidePublished':label=='production' and locale=='zh'})
for cid in ['castorice','seele','yao-guang']:
 p='/zh/starrail/characters/'+cid;s,b,h=req(p);text=html.unescape(b.decode());assert s==200 and '星魂第1层效果' not in text,p
 if cid=='castorice':assert '遐蝶' in text and '卡芙卡' not in text
 checks.append({'path':p,'status':s,'placeholderRemoved':True})
def asset(p):
 s,b,h=req(p);assert s==200,(p,s)
 local=(root/'artifact/assets'/urllib.parse.unquote(p.split('?',1)[0]).lstrip('/')).read_bytes()
 assert hashlib.sha256(b).digest()==hashlib.sha256(local).digest(),p
 return {'path':p,'status':s,'sha256':hashlib.sha256(b).hexdigest()}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:assetchecks=list(pool.map(asset,sorted(assets)))
result={'status':'passed','origin':origin,'revision':revisions[0],'checks':checks,'assets':assetchecks,'anonymousWriteRejected':True,'cloudContentWrites':0}
(root/(label+'-acceptance.json')).write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'status':'passed','label':label,'records':len(expected),'routes':len(checks),'assets':len(assetchecks)}))
