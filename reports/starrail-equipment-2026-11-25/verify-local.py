import urllib.request,urllib.error,json,pathlib,time,html
root=pathlib.Path(__file__).resolve().parent
token=json.loads((root/'.private/local.json').read_text())['vars']['STARRAIL_PUBLISH_TOKEN']
docs=json.loads((root/'expected-publication.json').read_text())['docs']
base='http://127.0.0.1:4400';checks=[]
def req(path,body=None,auth=True):
 headers={}
 if body is not None:headers={'content-type':'application/json',**({'authorization':'Bearer '+token} if auth else {})}
 q=urllib.request.Request(base+path,data=json.dumps(body).encode() if body is not None else None,headers=headers,method='PUT' if body is not None else 'GET')
 try:
  with urllib.request.urlopen(q,timeout=40) as r:return r.status,r.read().decode(),{k.lower():v for k,v in r.headers.items()}
 except urllib.error.HTTPError as e:return e.code,e.read().decode(),{k.lower():v for k,v in e.headers.items()}
rev=int(time.time()*1000)
assert req('/api/cms/starrail',{'revision':rev,'docs':docs},False)[0]==401;checks.append('anonymous_write_rejected')
s,b,h=req('/api/cms/starrail',{'revision':rev,'docs':docs});assert s==200,(s,b);checks.append('all_23_records_accepted_with_cn_sources')
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
for d in changed:
 if d['kind']=='guide':d['title']='CMS攻略更新'+d['slug'];d['summary']='CMS攻略摘要更新';d['facts']=[{'text':'CMS攻略章节\nCMS攻略事实已更新'}]
assert req('/api/cms/starrail',{'revision':rev+1,'docs':changed})[0]==200
for d in [row for row in changed if row['kind']=='guide']:
 path='/zh/starrail/guides/'+d['slug']; status,body,headers=req(path);body=html.unescape(body)
 assert status==200 and headers.get('cache-control')=='no-store'
 assert d['title'] in body and 'CMS攻略事实已更新' in body and 'CMS攻略摘要更新' in body
 assert 'FAQPage' not in body
checks.append('five_guide_bodies_and_metadata_replace_immediately')
for path in ['/zh/starrail','/zh/starrail/guides/banner-schedule-guide']:
 assert 'CMS读端回归测试跃迁' in html.unescape(req(path)[1])
assert req('/api/cms/starrail',{'revision':rev+2,'docs':[]})[0]==200
for path in ['/zh/starrail','/zh/starrail/guides/banner-schedule-guide','/zh/starrail/events']:
 body=html.unescape(req(path)[1]);assert 'CMS读端回归测试跃迁' not in body and docs[0]['title'] not in body
for d in [row for row in docs if row['kind']=='guide']:
 for locale in ['zh','en','ja']:
  status,body,headers=req('/'+locale+'/starrail/guides/'+d['slug']);body=html.unescape(body)
  assert status==200 and headers.get('cache-control')=='no-store'
  assert d['title'] not in body and 'CMS攻略事实已更新' not in body and 'FAQPage' not in body
  assert 'noindex' in body
checks.append('five_guides_withdraw_without_old_body_faq_or_indexing')
assert req('/api/cms/starrail',{'revision':rev+3,'docs':docs})[0]==200
for d in [row for row in docs if row['kind']=='guide']:
 for locale in ['zh','en','ja']:
  status,body,headers=req('/'+locale+'/starrail/guides/'+d['slug']);body=html.unescape(body)
  assert status==200 and headers.get('cache-control')=='no-store'
  if locale=='zh':
   assert d['title'] in body and d['summary'] in body and d['boundary'] in body
   for fact in d['facts']:
    assert all(paragraph in body for paragraph in fact['text'].split('\n'))
   assert '第三方资料' in body
  else:assert d['summary'] not in body and 'noindex' in body
checks.append('all_five_full_guides_and_three_locales_verified')
checks.append('all_live_readers_update_and_honor_full_withdrawal')
profile=next(d for d in docs if d.get('characterData'))
for locale in ['zh','en','ja']:
 for suffix in ['/characters/aha','/characters','/calculator']:
  status,body,headers=req('/'+locale+'/starrail'+suffix);body=html.unescape(body)
  assert status==200 and headers.get('cache-control')=='no-store'
  if locale=='zh':
   assert profile['characterData']['name'] in body
   if suffix!='/characters':assert '3,308,000' in body and '满月，是神在的时间' in body
  else:
   assert profile['summary'] not in body and '3,308,000' not in body
   if suffix=='/characters/aha':assert 'noindex' in body
checks.append('character_index_detail_calculator_share_verified_data_and_locale_isolation')
changed=json.loads(json.dumps(docs));newProfile=next(d for d in changed if d.get('characterData'))
newProfile['title']='CMS阿哈动态修订'
newProfile['characterData']['ascensions'][0]['materials'][0]['quantity']+=1
newProfile['characterData']['skills'][0]['levels'][0]['values'][0]='26%'
assert req('/api/cms/starrail',{'revision':rev+4,'docs':changed})[0]==200
for path in ['/zh/starrail/characters/aha','/zh/starrail/calculator']:
 body=html.unescape(req(path)[1]);assert '3,308,001' in body
assert '26%' in html.unescape(req('/zh/starrail/characters/aha')[1])
assert 'CMS阿哈动态修订' in html.unescape(req('/zh/starrail/characters')[1])
checks.append('character_numeric_data_metadata_index_and_calculator_replace_without_rebuild')
bad=json.loads(json.dumps(changed));next(d for d in bad if d.get('characterData'))['characterData']['skills']=[]
assert req('/api/cms/starrail',{'revision':rev+5,'docs':bad})[0]==400
assert req('/api/cms/starrail',{'revision':rev+5,'docs':[d for d in docs if not d.get('characterData')]})[0]==200
for path in ['/zh/starrail/characters/aha','/zh/starrail/characters','/zh/starrail/calculator']:
 body=html.unescape(req(path)[1]);assert '3,308,000' not in body and 'CMS阿哈动态修订' not in body
 if path.endswith('/aha'):assert 'noindex' in body
checks.append('malformed_character_rejected_and_withdrawal_removes_page_index_and_calculator_data')
assert req('/api/cms/starrail',{'revision':rev+6,'docs':docs})[0]==200
equipment=[d for d in docs if d['kind']=='equipment']
assert len(equipment)==3
for d in equipment:
 category='weapons' if d['slug']=='when-the-first-aha-rang-out' else 'artifacts'
 for locale in ['zh','en','ja']:
  path='/'+locale+'/starrail/'+category+'/'+d['slug'];status,body,headers=req(path);body=html.unescape(body)
  assert status==200 and headers.get('cache-control')=='no-store',path
  if locale=='zh':
   assert d['summary'] in body and d['boundary'] in body
   for fact in d['facts']:assert all(line in body for line in fact['text'].split('\n')),path
   assert d['title'] in html.unescape(req('/'+locale+'/starrail/'+category)[1]),path
  else:assert d['summary'] not in body and 'noindex' in body,path
checks.append('three_equipment_details_indices_full_effects_sources_and_locale_isolation')
changed=json.loads(json.dumps(docs))
for d in changed:
 if d['kind']=='equipment':d['title']='装备动态修订'+d['slug'];d['facts']=[{'text':'修订效果\n动态数值13点'}]
assert req('/api/cms/starrail',{'revision':rev+7,'docs':changed})[0]==200
for d in equipment:
 category='weapons' if d['slug']=='when-the-first-aha-rang-out' else 'artifacts'
 body=html.unescape(req('/zh/starrail/'+category+'/'+d['slug'])[1]);assert '动态数值13点' in body and '装备动态修订' in body
 assert '装备动态修订'+d['slug'] in html.unescape(req('/zh/starrail/'+category)[1])
assert req('/api/cms/starrail',{'revision':rev+8,'docs':[d for d in docs if d['kind']!='equipment']})[0]==200
for d in equipment:
 category='weapons' if d['slug']=='when-the-first-aha-rang-out' else 'artifacts'
 body=html.unescape(req('/zh/starrail/'+category+'/'+d['slug'])[1]);assert 'noindex' in body and d['summary'] not in body and '动态数值13点' not in body
 assert d['title'] not in html.unescape(req('/zh/starrail/'+category)[1])
assert req('/api/cms/starrail',{'revision':rev+9,'docs':docs})[0]==200
checks.append('equipment_facts_metadata_indices_replace_immediately_and_withdraw_without_legacy_fallback')
result={'status':'passed' ,'records':len(docs),'checks':checks,'writes':'local D1 only','productionWrites':0}
(root/'local-acceptance.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
