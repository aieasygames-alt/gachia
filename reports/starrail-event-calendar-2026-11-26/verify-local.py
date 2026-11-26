# -*- coding: utf-8 -*-
import urllib.request,urllib.error,json,pathlib,time,html
from bs4 import BeautifulSoup
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
s,b,h=req('/api/cms/starrail',{'revision':rev,'docs':docs});assert s==200,(s,b);checks.append('all_71_records_accepted_with_cn_sources')
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
assert len(equipment)==17
for d in equipment:
 category='weapons' if d['slug'] not in ['gods-momentary-bliss','subspace-sanctuary'] else 'artifacts'
 for locale in ['zh','en','ja']:
  path='/'+locale+'/starrail/'+category+'/'+d['slug'];status,body,headers=req(path);body=html.unescape(body)
  assert status==200 and headers.get('cache-control')=='no-store',path
  if locale=='zh':
   assert d['summary'] in body and d['boundary'] in body
   for fact in d['facts']:assert all(line in body for line in fact['text'].split('\n')),path
   assert d['title'] in html.unescape(req('/'+locale+'/starrail/'+category)[1]),path
  else:assert d['summary'] not in body and 'noindex' in body,path
checks.append('seventeen_equipment_details_indices_full_effects_sources_and_locale_isolation')
changed=json.loads(json.dumps(docs))
for d in changed:
 if d['kind']=='equipment':d['title']='装备动态修订'+d['slug'];d['facts']=[{'text':'修订效果\n动态数值13点'}]
assert req('/api/cms/starrail',{'revision':rev+7,'docs':changed})[0]==200
for d in equipment:
 category='weapons' if d['slug'] not in ['gods-momentary-bliss','subspace-sanctuary'] else 'artifacts'
 body=html.unescape(req('/zh/starrail/'+category+'/'+d['slug'])[1]);assert '动态数值13点' in body and '装备动态修订' in body
 assert '装备动态修订'+d['slug'] in html.unescape(req('/zh/starrail/'+category)[1])
assert req('/api/cms/starrail',{'revision':rev+8,'docs':[d for d in docs if d['kind']!='equipment']})[0]==200
for d in equipment:
 category='weapons' if d['slug'] not in ['gods-momentary-bliss','subspace-sanctuary'] else 'artifacts'
 body=html.unescape(req('/zh/starrail/'+category+'/'+d['slug'])[1]);assert 'noindex' in body and d['summary'] not in body and '动态数值13点' not in body
 assert d['title'] not in html.unescape(req('/zh/starrail/'+category)[1])
for locale in ['zh','en','ja']:
 body=html.unescape(req('/'+locale+'/starrail/weapons')[1]);page=BeautifulSoup(body,'html.parser')
 for slug in [d['slug'] for d in equipment if d['slug'] not in ['gods-momentary-bliss','subspace-sanctuary']]:
  assert not page.select('a[href="/'+locale+'/starrail/weapons/'+slug+'"]'),(locale,slug,'legacy card returned after withdrawal')
checks.append('legacy_owned_cards_absent_after_withdrawal_in_all_locales')
assert req('/api/cms/starrail',{'revision':rev+9,'docs':docs})[0]==200
body=html.unescape(req('/zh/starrail/weapons')[1]);page=BeautifulSoup(body,'html.parser')
for d in equipment:
 if d['slug'] in ['gods-momentary-bliss','subspace-sanctuary']:continue
 assert len(page.select('a[href="/zh/starrail/weapons/'+d['slug']+'"]'))==1,d['slug']
checks.append('each_published_cone_has_exactly_one_index_link')
checks.append('equipment_facts_metadata_indices_replace_immediately_and_withdraw_without_legacy_fallback')
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,newurl):return None
aliasclient=urllib.request.build_opener(NoRedirect())
for locale in ['zh','en','ja']:
 path='/'+locale+'/starrail/weapons/welcome-to-the-cosmic-city'
 try:aliasclient.open(base+path,timeout=30);raise AssertionError('Alias did not redirect')
 except urllib.error.HTTPError as e:
  assert e.code==308 and e.headers['location'].endswith('/'+locale+'/starrail/weapons/welcome-to-the-galactic-city'),(path,e.code,dict(e.headers))
  assert e.headers.get('cache-control')=='no-store'
 assert not BeautifulSoup(req('/'+locale+'/starrail/weapons')[1],'html.parser').select('a[href="'+path+'"]')
checks.append('historical_alias_redirects_308_to_canonical_same_locale_without_duplicate_card')
materials=[d for d in docs if d['kind']=='material'];assert len(materials)==34
registry=json.loads((root/'material-registry.json').read_text())
for d in materials:
 for locale in ['zh','en','ja']:
  path='/'+locale+'/starrail/items/'+d['slug'];status,body,headers=req(path);body=html.unescape(body)
  assert status==200 and headers.get('cache-control')=='no-store' and 'FAQPage' not in body,path
  if locale=='zh':
   assert d['summary'] in body and d['boundary'] in body
   for f in d['facts']:assert all(line in body for line in f['text'].split('\n')),path
   for eid in registry[d['slug']]['equipment']:assert '/starrail/weapons/'+eid in body,(path,eid)
  else:assert d['summary'] not in body and 'noindex' in body,path
  page=BeautifulSoup(req('/'+locale+'/starrail/items')[1],'html.parser')
  assert len(page.select('a[href="'+path+'"]'))==(1 if locale=='zh' else 0),(path,'index')
 for eid in registry[d['slug']]['equipment']:
  body=req('/zh/starrail/weapons/'+eid)[1];assert '/zh/starrail/items/'+d['slug'] in body,(d['slug'],eid)
checks.append('thirty_four_full_materials_and_verified_cone_relationships_render_in_same_locale_once')
changed=json.loads(json.dumps(docs))
for d in changed:
 if d['kind']=='material':d['title']='材料动态修订'+d['slug'];d['facts']=[{'text':'材料条件\n获取条件已即时修订'}]
assert req('/api/cms/starrail',{'revision':rev+10,'docs':changed})[0]==200
for d in materials:
 body=html.unescape(req('/zh/starrail/items/'+d['slug'])[1]);assert '获取条件已即时修订' in body and '材料动态修订' in body
 assert '材料动态修订'+d['slug'] in html.unescape(req('/zh/starrail/items')[1])
assert '材料动态修订' in html.unescape(req('/zh/starrail/weapons/before-dawn')[1])
checks.append('material_body_metadata_index_and_cone_link_titles_update_without_rebuild')
bad=json.loads(json.dumps(docs));bad[-1]['slug']='unreviewed-material'
assert req('/api/cms/starrail',{'revision':rev+11,'docs':bad})[0]==400
assert req('/api/cms/starrail',{'revision':rev+11,'docs':[d for d in docs if d['kind']!='material']})[0]==200
for locale in ['zh','en','ja']:
 page=BeautifulSoup(req('/'+locale+'/starrail/items')[1],'html.parser')
 for d in materials:
  path='/'+locale+'/starrail/items/'+d['slug'];body=html.unescape(req(path)[1]);assert 'noindex' in body and d['summary'] not in body and '获取条件已即时修订' not in body and 'FAQPage' not in body,path
  assert not page.select('a[href="'+path+'"]'),(path,'legacy fallback')
  for eid in registry[d['slug']]['equipment']:
   cone=req('/'+locale+'/starrail/weapons/'+eid)[1];assert path not in cone,(path,eid,'withdrawn material link')
checks.append('material_withdrawal_removes_thirty_four_bodies_indices_and_cone_links_without_raw_fallback_or_FAQ')
assert req('/api/cms/starrail',{'revision':rev+12,'docs':[d for d in docs if d['kind']!='equipment']})[0]==200
for d in materials:
 body=req('/zh/starrail/items/'+d['slug'])[1];assert 'data-starrail-material-equipment' not in body
checks.append('withdrawn_equipment_is_not_linked_from_material_details')
assert req('/api/cms/starrail',{'revision':rev+13,'docs':docs})[0]==200
checks.append('full_71_records_restored_in_isolated_local_D1')
# Isolated D1 calendar mutations; these never target production.
owners=[d for d in docs if d.get('eventSchedule')];assert len(owners)==3
status,body,headers=req('/zh/starrail/events');page=BeautifulSoup(html.unescape(body),'html.parser');assert len(page.select('[data-event-id]'))==11
for d in owners:
 for e in d['eventSchedule']['entries']:
  card=page.select('[data-event-id="'+e['id']+'"]');assert len(card)==1
  assert e['note'] in card[0].get_text() and e['eligibility'] in card[0].get_text()
checks.append('eleven_calendar_entries_conditions_notes_sources_and_cross_year_windows')
changed=json.loads(json.dumps(docs));owner=next(d for d in changed if d.get('eventSchedule'))
owner['eventSchedule']['entries'][0]['end']={'kind':'at','value':'2027-02-01T03:59'}
owner['eventSchedule']['entries'][0]['note']='日历动态修订独立本机验证'
assert req('/api/cms/starrail',{'revision':rev+14,'docs':changed})[0]==200
body=html.unescape(req('/zh/starrail/events')[1]);assert '2027/02/01 03:59' in body and '日历动态修订独立本机验证' in body
for invalid in ['2026-02-30T04:00','2026-12-23T03:59+08:00']:
 bad=json.loads(json.dumps(docs));next(d for d in bad if d.get('eventSchedule'))['eventSchedule']['entries'][0]['end']={'kind':'at','value':invalid}
 assert req('/api/cms/starrail',{'revision':rev+15,'docs':bad})[0]==400
bad=json.loads(json.dumps(docs));scheduled=[d for d in bad if d.get('eventSchedule')];scheduled[1]['eventSchedule']['entries'][0]['id']=scheduled[0]['eventSchedule']['entries'][0]['id']
assert req('/api/cms/starrail',{'revision':rev+15,'docs':bad})[0]==400
checks.append('calendar_revision_immediate_and_invalid_dates_offsets_duplicate_id_rejected')
withdrawn=[d for d in docs if d['slug']!=owners[0]['slug']]
assert req('/api/cms/starrail',{'revision':rev+15,'docs':withdrawn})[0]==200
body=req('/zh/starrail/events')[1];page=BeautifulSoup(body,'html.parser')
assert len(page.select('[data-event-id]'))==11-len(owners[0]['eventSchedule']['entries'])
for e in owners[0]['eventSchedule']['entries']:assert not page.select('[data-event-id="'+e['id']+'"]')
assert req('/api/cms/starrail',{'revision':rev+16,'docs':[d for d in docs if not d.get('eventSchedule')]})[0]==200
for locale in ['zh','en','ja']:
 body=req('/'+locale+'/starrail/events')[1];assert 'data-event-calendar' not in body and '日历动态修订独立本机验证' not in body
assert req('/api/cms/starrail',{'revision':rev+17,'docs':docs})[0]==200
checks.append('partial_and_full_calendar_withdrawal_and_three_language_isolation_without_legacy_fallback')
result={'status':'passed' ,'records':len(docs),'checks':checks,'writes':'local D1 only','productionWrites':0}
(root/'local-acceptance.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
