"""Exercise the built Worker and D1; never sends writes to production."""
import json,pathlib,urllib.request,urllib.error,time,html
r=pathlib.Path(__file__).resolve().parent
config=json.loads((r/'.private/local.json').read_text());token=config['vars']['STARRAIL_PUBLISH_TOKEN'];docs=json.loads((r/'expected-publication.json').read_text())['docs']
rev=int(time.time()*1000);base='http://127.0.0.1:4400';checks=[]
def req(path,body=None,auth=True):
 h={'User-Agent':'GachiaCMS/1.0'}
 if body is not None:h.update({'content-type':'application/json',**({'authorization':'Bearer '+token} if auth else {})})
 q=urllib.request.Request(base+path,data=json.dumps(body,ensure_ascii=False).encode() if body is not None else None,headers=h,method='PUT' if body is not None else 'GET')
 try:
  with urllib.request.urlopen(q,timeout=45) as res:return res.status,html.unescape(res.read().decode()),res.headers
 except urllib.error.HTTPError as e:return e.code,e.read().decode(),e.headers
put=lambda docs,n=0,auth=True:req('/api/cms/starrail',{'revision':rev+n,'docs':docs},auth)
assert put(docs,auth=False)[0]==401
assert put(docs)[0]==200
for locale in ['zh','en','ja']:
 s,b,h=req('/api/cms/starrail?locale='+locale);assert s==200 and json.loads(b)['docs']==[d for d in docs if d['locale']==locale]
 for suffix in ['/characters/yaoguang','/characters/aha','/characters','/calculator']:
  s,b,h=req('/'+locale+'/starrail'+suffix);assert s==200 and h.get('cache-control')=='no-store',(locale,suffix,s)
  if locale=='zh':
   assert ('爻光' if suffix!='/characters/aha' else '阿哈') in b
   if suffix=='/characters/yaoguang':
    assert '81.25%' in b and '3,308,000' in b and '侵略凝块' in b and '灭流绝溢的缄默' in b
   if suffix=='/calculator':assert '<option value="yaoguang">爻光</option>' in b and '<option value="aha" selected="">' in b
  else:
   assert '3,308,000' not in b
   if suffix.startswith('/characters/'):assert 'noindex' in b
checks.append('two_character_details_index_calculator_locale_isolation_and_no_store')
s,b,h=req('/zh/starrail/events');assert b.count('data-event-id="')==15
checks.append('all_15_cn_calendar_entries_preserved')
s,b,h=req('/zh/starrail/characters');assert 'href="/zh/starrail/characters/yao-guang"' not in b
checks.append('legacy_character_card_removed_without_publishing_old_fallback')
for bad in [dict(docs[-1],slug='aha-character-data'),dict(docs[-1],_status='draft'),dict(docs[-1],sources=[{'url':'https://starrailstation.com/cn/character/yaoguang?unreviewed=1'}]),dict(docs[-1],characterData=dict(docs[-1]['characterData'],nodes=[]))]:
 assert put(docs[:-1]+[bad],1)[0]==400
assert put(docs,-1)[0]==409
checks.append('anonymous_draft_bad_owner_bad_source_incomplete_data_and_stale_revision_rejected')
s,b,h=req('/zh/starrail/characters/silver-wolf-lv999');assert h.get('cache-control')=='no-store' and '纷争先兆' in b and '73.125%' in b
s,b,h=req('/zh/starrail/characters');assert b.count('href="/zh/starrail/characters/silver-wolf-lv999"')==1 and 'href="/zh/starrail/characters/silver-wolf"' in b
for locale in ['en','ja']:
 s,b,h=req('/'+locale+'/starrail/characters/silver-wolf-lv999');assert 'noindex' in b and '73.125%' not in b
swchanged=json.loads(json.dumps(docs));sw=next(d for d in swchanged if d['slug']=='silver-wolf-lv999-character-data');sw['characterData']['skills'][0]['levels'][0]['values'][0]='50.01%'
assert put(swchanged,1)[0]==200
s,b,h=req('/zh/starrail/characters/silver-wolf-lv999');assert '50.01%' in b
assert put([d for d in docs if d['slug']!='silver-wolf-lv999-character-data'],2)[0]==200
s,b,h=req('/zh/starrail/characters/silver-wolf-lv999');assert 'noindex' in b and '73.125%' not in b
s,b,h=req('/zh/starrail/characters');assert 'href="/zh/starrail/characters/silver-wolf-lv999"' not in b and 'href="/zh/starrail/characters/silver-wolf"' in b
s,b,h=req('/zh/starrail/calculator');assert '<option value="silver-wolf-lv999"' not in b and '<option value="yaoguang"' in b
checks.append('silver_wolf_form_dynamic_update_withdrawal_and_original_character_preservation')
assert put(docs,3)[0]==200
rev+=3
s,b,h=req('/zh/starrail/characters/sparxie');assert h.get('cache-control')=='no-store' and '明辉日珥' in b and '40.625%' in b
s,b,h=req('/zh/starrail/characters');assert b.count('href="/zh/starrail/characters/sparxie"')==1 and 'href="/zh/starrail/characters/sparkle"' in b
for locale in ['en','ja']:
 s,b,h=req('/'+locale+'/starrail/characters/sparxie');assert 'noindex' in b and '40.625%' not in b
swchanged=json.loads(json.dumps(docs));sw=next(d for d in swchanged if d['slug']=='sparxie-character-data');sw['characterData']['skills'][0]['levels'][0]['values'][0]='50.01%'
assert put(swchanged,1)[0]==200
s,b,h=req('/zh/starrail/characters/sparxie');assert '50.01%' in b
assert put([d for d in docs if d['slug']!='sparxie-character-data'],2)[0]==200
s,b,h=req('/zh/starrail/characters/sparxie');assert 'noindex' in b and '40.625%' not in b
s,b,h=req('/zh/starrail/characters');assert 'href="/zh/starrail/characters/sparxie"' not in b and 'href="/zh/starrail/characters/sparkle"' in b
s,b,h=req('/zh/starrail/calculator');assert '<option value="sparxie"' not in b and '<option value="yaoguang"' in b
checks.append('sparxie_form_dynamic_update_withdrawal_and_original_character_preservation')
assert put(docs,3)[0]==200
rev+=3
ach=next(d for d in docs if d['slug']=='acheron-character-data')
for skills in [ach['characterData']['skills'][:3], ach['characterData']['skills']+[next(d for d in docs if d['slug']=='aha-character-data')['characterData']['skills'][4]]]:
 bad=json.loads(json.dumps(docs));next(d for d in bad if d['slug']==ach['slug'])['characterData']['skills']=skills
 assert put(bad,1)[0]==400
checks.append('acheron_missing_or_extra_skill_rejected_by_real_worker')
s,b,h=req('/zh/starrail/characters/acheron');assert h.get('cache-control')=='no-store' and '炼形者雷枝' in b and '238.08%' in b
s,b,h=req('/zh/starrail/characters');assert b.count('href="/zh/starrail/characters/acheron"')==1
for locale in ['en','ja']:
 s,b,h=req('/'+locale+'/starrail/characters/acheron');assert 'noindex' in b and '238.08%' not in b
swchanged=json.loads(json.dumps(docs));sw=next(d for d in swchanged if d['slug']=='acheron-character-data');sw['characterData']['skills'][0]['levels'][0]['values'][0]='50.01%'
assert put(swchanged,1)[0]==200
s,b,h=req('/zh/starrail/characters/acheron');assert '50.01%' in b
assert put([d for d in docs if d['slug']!='acheron-character-data'],2)[0]==200
s,b,h=req('/zh/starrail/characters/acheron');assert 'noindex' in b and '238.08%' not in b
s,b,h=req('/zh/starrail/characters');assert 'href="/zh/starrail/characters/acheron"' not in b
s,b,h=req('/zh/starrail/calculator');assert '<option value="acheron"' not in b and '<option value="yaoguang"' in b
checks.append('acheron_four_skills_dynamic_update_withdrawal_without_legacy_fallback')
assert put(docs,3)[0]==200
rev+=3
changed=json.loads(json.dumps(docs));yao=next(d for d in changed if d['slug']=='yaoguang-character-data');yao['title']='爻光动态修订验收';yao['characterData']['ascensions'][0]['materials'][0]['quantity']+=1;yao['characterData']['skills'][4]['levels'][6]['values'][0]='81.251%'
assert put(changed,1)[0]==200
s,b,h=req('/zh/starrail/characters/yaoguang');assert '81.251%' in b and '3,308,001' in b and '爻光动态修订验收' in b
s,b,h=req('/zh/starrail/characters');assert '爻光动态修订验收' in b
assert put([d for d in docs if d['slug']!='yaoguang-character-data'],2)[0]==200
s,b,h=req('/zh/starrail/characters/yaoguang');assert 'noindex' in b and '3,308,000' not in b and '81.25%' not in b
s,b,h=req('/zh/starrail/characters');assert 'href="/zh/starrail/characters/yaoguang"' not in b and 'href="/zh/starrail/characters/aha"' in b
s,b,h=req('/zh/starrail/calculator');assert '<option value="yaoguang"' not in b and '<option value="aha"' in b
checks.append('yaoguang_dynamic_numeric_update_withdrawal_hides_all_three_readers_preserving_aha')
assert put([d for d in docs if not d.get('characterData')],3)[0]==200
s,b,h=req('/zh/starrail/calculator');assert '已核验角色材料' not in b and '3,308,000' not in b
checks.append('all_character_withdrawal_removes_verified_calculator_tab')
assert put(docs,4)[0]==200
(r/'local-acceptance.json').write_text(json.dumps({'status':'passed','records':len(docs),'checks':checks,'writes':'local D1 only','productionWrites':0},ensure_ascii=False,indent=2)+'\n');print('Built Worker/D1 acceptance passed:',len(checks),'groups')
