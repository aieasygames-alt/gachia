# -*- coding: utf-8 -*-
import json,pathlib,urllib.parse,re
from bs4 import BeautifulSoup
root=pathlib.Path(__file__).resolve().parent;repo=root.parents[1]
assert not (root/'batch.json').exists(), 'Preserve existing reviewed batch; prepare a new batch instead.'
read=lambda p:json.loads(p.read_text())
def write(n,x):(root/n).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
cn=read(root/'.private/cn-items.json');en=read(root/'.private/en-items.json');before=read(root/'cloud-before.json')['docs']
candidates=read(root.parent/'starrail-materials-enemies-2026-11-25/remaining-priorities.json')['remainingMaterials']
slugs=['endurance-of-bronze','oath-of-steel','safeguard-of-amber','seed-of-abundance','sprout-of-life','flower-of-eternity','borisin-teeth','lupitoxin-sawteeth','moon-rage-fang','meteoric-bullet','destined-expiration','countertemporal-shot','fiery-spirit','starfire-essence','heaven-incinerator','credit']
registry={slug:{'name':c['name'],'sourceId':c['id'],'equipment':[next(d['slug'] for d in before if d['kind']=='equipment' and d['title'].split('：')[0]==n) for n in c['usedBy']]} for slug,c in zip(slugs,candidates)}
assert len(registry)==len(candidates)==16
allregistry={**read(root.parent/'starrail-materials-enemies-2026-11-25/material-registry.json'),**registry}
write('material-registry-new.json',registry);write('material-registry.json',allregistry)
creates=[];comparisons=[];repairs=[];rawpath=repo/'packages/data/games/starrail/raw-materials.json';rows=read(rawpath)
pinned='https://raw.githubusercontent.com/Mar-7th/StarRailRes/03907e798b46f9eb109a1f882055cdf49ce3d374/index_new/cn/items.json'
normalize=lambda v:re.sub(r'\s+','',v)
for slug,entry in registry.items():
 sid=entry['sourceId'];item=cn[sid];name=item['name'];s=BeautifulSoup((root/'.private'/f'{name}.html').read_bytes(),'html.parser')
 assert s.select_one('#firstHeading').get_text(strip=True)==name
 t={th.get_text(strip=True):th.find_next_sibling() for th in s.select('th') if th.find_next_sibling()};routes=t['获取途径'].get_text(' ',strip=True)
 rarity=t['稀有度'].select_one('img')['alt'];assert rarity==str(item['rarity'])+'星.png'
 matched=[i for i,v in enumerate(item['come_from']) if normalize(v) in normalize(routes)]
 verified=[item['come_from'][i] for i in matched];unconfirmed=[v for i,v in enumerate(item['come_from']) if i not in matched]
 assert len(verified)==(7 if slug=='credit' else len(item['come_from']))
 assert unconfirmed==(['拟造花萼【鸽川区】'] if slug=='credit' else [])
 extra=normalize(routes)
 for v in verified:extra=extra.replace(normalize(v),'')
 assert not extra,(name,extra)
 common=[{'text':'已交叉核对的获取途径\n'+'；'.join(verified)+'。'}]
 if slug=='credit':
  facts=[{'text':'货币身份与用途范围\n信用点，3星品质。此处按通用货币条目整理获取途径和已核验光锥晋阶消耗，不作为某一命途的专属材料。'},*common,{'text':'来源差异与当前边界\nStarRailRes固定数据还列出拟造花萼【鸽川区】，本次读取的BWIKI信用点详情未列出该地点，因此未纳入已交叉核验的获取列表。来源页的排版空格仅作匹配归一化，不把不同地区名称合并。上述来源不代表信用点的全部获取方式。'},{'text':'培养开支的统计口径\n下方示例只统计单件光锥的六次晋阶信用点；不含升级喂经验所需信用点、角色晋阶、行迹或其他强化、兑换开支。规划培养预算时须将这些项目分别计算，不能把晋阶合计当作总成本。'},{'text':'商店与产出范围\n余烬兑换不代表当前库存、价格或限购次数已核验；拟造花萼列地点入口，不提供固定难度、单次产量、体力效率或掉率。以当前客户端规则为准。'}]
  summary='信用点已核验获取入口、来源差异及九件光锥六次晋阶消耗示例，明确区分晋阶信用点与完整培养成本。'
  title='信用点：获取途径与晋阶消耗范围'
 else:
  place=verified[0]
  assert place.startswith('拟造花萼【')
  facts=[{'text':f'材料身份\n{name}，{item["rarity"]}星。用于使用该系列的角色行迹及光锥晋阶；同一命途的新旧角色、光锥未必共用同一组材料，须按具体条目核对。'},*common,{'text':f'刷取入口与开放范围\n主要刷取入口为{place}。本页没有核准关卡具体难度、开放条件、每次产出或掉率；材料品质不等同于该难度已开放，请查看当前客户端掉落预览。不能用同命途的其他地区材料系列直接替代本系列。'},{'text':'合成、置换与余烬兑换\n各品质分别按上述列表保留来源，不能把2星、3星的余烬兑换推广为4星也可兑换。合成和置换的比例、信用点消耗、解锁条件以及商店即时库存、价格和限购次数，本批未核准，以当前客户端为准。'}]
  summary=f'{item["rarity"]}星{name}的拟造花萼地点、合成或兑换来源及关联光锥晋阶用量，区分不同品质和材料系列。'
  title=name+'：用途与获取途径'
 uses=[]
 for d in before:
  if d['slug'] not in entry['equipment']:continue
  total=next((f['text'] for f in d['facts'] if '合计' in f['text'].split('\n')[0] and name in f['text']),None);assert total,(name,d['slug'])
  m=re.search(re.escape(name)+r'[×x]\s*([\d,]+)',total);assert m,(name,total)
  uses.append(d['title'].split('：')[0]+'：'+name+'×'+m[1])
 assert len(uses)==len(entry['equipment'])
 facts.append({'text':'已核验光锥的六次晋阶用量示例\n'+'；'.join(uses)+'。这里只汇总光锥六次晋阶，不含升级经验、喂经验信用点或角色行迹用量；单件完整材料见关联光锥详情。'})
 boundary='截至2026-11-26，以BWIKI具体详情和StarRailRes固定提交交叉核对名称、稀有度及上述主要来源；两者可能共用上游游戏数据，不代表官方逐项认证或客户端实测。用途与数量示例仅覆盖关联的已核验光锥，不是全部角色或光锥需求清单。关卡开放、难度、固定产量、掉率、合成/置换成本及商店即时库存仍须查看当前客户端。'
 if unconfirmed:boundary+='固定数据独有的拟造花萼【鸽川区】缺少本次第二来源印证，未纳入已核验来源；不据页面未收录推断该入口一定不存在。'
 creates.append({'gameId':'starrail','locale':'zh','kind':'material','slug':slug,'title':title,'summary':summary,'region':'国服名称；公开数据交叉核对','checkedAt':'2026-11-26','facts':facts,'boundary':boundary,'sources':[{'url':'https://wiki.biligame.com/sr/'+urllib.parse.quote(name)},{'url':pinned}],'_status':'published'})
 comparisons.append({'id':sid,'slug':slug,'name':name,'rarity':item['rarity'],'bwikiHeading':name,'bwikiRarity':rarity,'pinnedRoutes':item['come_from'],'bwikiRoutesText':routes,'matchingNormalization':'whitespace only','verifiedRoutes':verified,'pinnedNotCrossVerified':unconfirmed,'bwikiAdditionalNotCrossVerified':extra,'relatedPublishedCones':entry['equipment']})
 old=next((x for x in rows if x['id']==slug),None)
 after={**(old or {}),'id':slug,'name':name,'nameEn':en[sid]['name'],'type':'currency' if slug=='credit' else 'trace','rarity':item['rarity'],'source':'；'.join(verified),'sourceEn':'; '.join(en[sid]['come_from'][i] for i in matched)}
 if old:rows[rows.index(old)]=after
 else:rows.append(after)
 repairs.append({'id':slug,'sourceId':sid,'before':old,'after':after,'sourceScope':'only cross-verified routes; EN follows matched CN route indexes'})
write('source-comparison.json',comparisons);write('compatibility-repairs.json',repairs);write('batch.json',{'updates':[],'creates':creates})
(repo/'packages/data/cms/starrail-materials.ts').write_text('// Explicit route ownership and verified light-cone relationships; withdrawal never restores legacy data.\nexport const STARRAIL_CMS_MATERIALS = '+json.dumps(allregistry,ensure_ascii=False,indent=2)+' as const;\nexport function isStarRailCmsMaterial(id: string): id is keyof typeof STARRAIL_CMS_MATERIALS {\n  return Object.hasOwn(STARRAIL_CMS_MATERIALS, id);\n}\n')
text=json.dumps(rows,ensure_ascii=False,indent=2)+'\n';rawpath.write_text(text);(repo/'apps/web/public/data/starrail/raw-materials.json').write_text(text)
p=repo/'packages/data/cms/starrail-updates.ts';text=p.read_text();index=text.index("  'https://wiki.biligame.com/sr/");p.write_text(text[:index]+''.join("  '"+d['sources'][0]['url']+"',\n" for d in creates)+text[index:])
print('Prepared 15 trace materials + Credit with 7 corroborated routes; 34 owned material routes')
