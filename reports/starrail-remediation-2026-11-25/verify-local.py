import urllib.request,urllib.error,json,pathlib,time,html
root=pathlib.Path(__file__).resolve().parent
token=json.loads((root/'.private/local.json').read_text())['vars']['STARRAIL_PUBLISH_TOKEN']
docs=json.loads((root/'cloud-before.json').read_text())['docs']
base='http://127.0.0.1:4399';checks=[]
def req(path,body=None,auth=True):
 headers={}
 if body is not None:headers={'content-type':'application/json',**({'authorization':'Bearer '+token} if auth else {})}
 q=urllib.request.Request(base+path,data=json.dumps(body).encode() if body is not None else None,headers=headers,method='PUT' if body is not None else 'GET')
 try:
  with urllib.request.urlopen(q,timeout=40) as r:return r.status,r.read().decode(),{k.lower():v for k,v in r.headers.items()}
 except urllib.error.HTTPError as e:return e.code,e.read().decode(),{k.lower():v for k,v in e.headers.items()}
rev=int(time.time()*1000)
assert req('/api/cms/starrail',{'revision':rev,'docs':docs},False)[0]==401;checks.append('anonymous_write_rejected')
s,b,h=req('/api/cms/starrail',{'revision':rev,'docs':docs});assert s==200,(s,b);checks.append('all_14_records_accepted_with_cn_sources')
for locale in ['zh','en','ja']:
 s,b,h=req('/api/cms/starrail?locale='+locale);actual=json.loads(b)
 assert actual['docs']==[d for d in docs if d['locale']==locale]
 s,b,h=req('/'+locale+'/starrail/version');assert s==200 and h.get('cache-control')=='no-store'
 text=html.unescape(b)
 if locale=='zh':
  for d in docs:
   assert d['title'] in text and d['summary'] in text and d['boundary'] in text
   assert all(f['text'] in text for f in d['facts'])
 else:assert all(d['title'] not in text for d in docs)
checks.append('complete_text_rendered_and_three_locales_isolated_no_store')
bad=json.loads(json.dumps(docs));bad[-1]['sources']=[{'url':'https://www.miyoushe.com/ys/article/79482327'}]
assert req('/api/cms/starrail',{'revision':rev+1,'docs':bad})[0]==400;checks.append('non_starrail_source_rejected')
bad[-1]['sources']=[{'url':'https://www.miyoushe.com/sr/article/79482327?redirect=example.com'}]
assert req('/api/cms/starrail',{'revision':rev+1,'docs':bad})[0]==400;checks.append('noncanonical_source_rejected')
bad=json.loads(json.dumps(docs));bad[-1]['_status']='draft'
assert req('/api/cms/starrail',{'revision':rev+1,'docs':bad})[0]==400;checks.append('draft_rejected')
assert req('/api/cms/starrail',{'revision':rev-1,'docs':docs})[0]==409;checks.append('stale_revision_rejected')
for path in ['/zh/starrail','/zh/starrail/guides/banner-schedule-guide','/zh/starrail/events']:
 s,b,h=req(path);assert s==200 and h.get('cache-control')=='no-store',(path,s,h)
 assert '4.6正式版本' not in b and '按v4.4 live处理' not in b,path
checks.append('home_warps_events_are_live_no_store_without_stale_version_copy')
s,b,h=req('/zh/starrail/characters/castorice');assert s==200 and '遐蝶' in b and '星魂第1层效果' not in b
checks.append('castorice_name_and_template_cleanup')
changed=json.loads(json.dumps(docs))
for d in changed:
 if d['kind']=='banner':d['title']='CMS读端回归测试跃迁';d['facts']=[{'text':'CMS读端回归测试事实'}]
assert req('/api/cms/starrail',{'revision':rev+1,'docs':changed})[0]==200
for path in ['/zh/starrail','/zh/starrail/guides/banner-schedule-guide']:
 assert 'CMS读端回归测试跃迁' in html.unescape(req(path)[1])
assert req('/api/cms/starrail',{'revision':rev+2,'docs':[]})[0]==200
for path in ['/zh/starrail','/zh/starrail/guides/banner-schedule-guide','/zh/starrail/events']:
 body=html.unescape(req(path)[1]);assert 'CMS读端回归测试跃迁' not in body and docs[0]['title'] not in body
assert req('/api/cms/starrail',{'revision':rev+3,'docs':docs})[0]==200
checks.append('all_live_readers_update_and_honor_full_withdrawal')
result={'status':'passed','records':len(docs),'checks':checks,'writes':'local D1 only','productionWrites':0}
(root/'local-acceptance.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
