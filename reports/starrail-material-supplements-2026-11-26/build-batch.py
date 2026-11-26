# -*- coding: utf-8 -*-
"""Prepare a content-only batch; retain the approved item pages as citation entry points."""
import copy
import json
import pathlib
import urllib.parse

root = pathlib.Path(__file__).resolve().parent
read = lambda name: json.loads((root / name).read_text())
def write(name, value):
    with (root / name).open('x') as output:
        json.dump(value, output, ensure_ascii=False, indent=2)
        output.write('\n')

before = read('cloud-before.json')['docs']
slugs = ['immortal-scionette', 'immortal-flower', 'artifexs-module', 'artifexs-cyberheart']
shop = 'https://wiki.biligame.com/sr/NPC%E5%95%86%E5%BA%97#' + urllib.parse.quote('阿合马铁窗集团')
calyx = 'https://wiki.biligame.com/sr/' + urllib.parse.quote('拟造花萼')
patches = []
for slug in slugs:
    row = next(row for row in before if row['slug'] == slug)
    facts = copy.deepcopy(row['facts'])
    facts.insert(2, {'text': 'BWIKI补充商店入口（单站资料）\nBWIKI材料详情列有「阿合马铁窗集团」，这是一个完整的商店名称。可从下方BWIKI材料来源中的同名链接进入NPC商店条目；该条目将其列在仙舟「罗浮」幽囚狱，店主为阿合马，交易使用奇巧零食。材料页和商店页属于同一站点，这一补充未取得第二独立来源印证，不并入上方已交叉核对的来源列表。'})
    boundary = row['boundary'].split('BWIKI还列出')[0].replace('2026-11-25', '2026-11-26')
    boundary += '本次核清「阿合马铁窗集团」是单个商店名称，补充其站内链接指向的地点、店主与交易物品；这部分仅为BWIKI单站资料，不代表官方确认或当前客户端实测。价格、每日限购、即时库存及商店解锁任务未完成独立核验；不能将敌人掉落的均衡等级要求套用于商店。'
    summary = row['summary'].split('；')[0] + '；补充BWIKI所列阿合马铁窗集团商店入口，并区分单站资料与交叉核对来源。'
    patches.append({'slug': slug, 'data': dict(summary=summary, facts=facts, boundary=boundary, checkedAt='2026-11-26')})

credit = next(row for row in before if row['slug'] == 'credit')
facts = copy.deepcopy(credit['facts'])
facts[2] = {'text': '来源差异与花萼类型\nStarRailRes固定数据还列出拟造花萼【鸽川区】，BWIKI信用点详情未列。沿该详情中的「拟造花萼」链接查看BWIKI总表，其将二相乐园的鸽川区列在回忆之蕾、以太之蕾，将藏珍之蕾列在绘世学院；同页说明回忆之蕾、以太之蕾另有共同奖励信用点。因此「可得信用点」与「藏珍之蕾主产信用点」需要区分，不能仅凭地点名称认定为同类副本。此为BWIKI单站分类说明，未独立印证当前国服关卡；鸽川区、绘世学院均暂不并入上方已交叉核对列表，也不据此断言固定数据错误或鸽川区不产信用点。'}
boundary = credit['boundary'].split('固定数据独有')[0]
boundary += '本次补读信用点详情链接的BWIKI花萼总表，发现鸽川区与绘世学院的副本类型差异；该说明来自同站资料，不能算第二独立来源。尚未核准当前国服两地关卡类型与主产/附带奖励，暂不扩大已交叉核对的入口列表。'
patches.append({'slug': 'credit', 'data': dict(summary='信用点已核验入口、鸽川区与绘世学院花萼类型的单站差异说明，以及九件光锥六次晋阶开支示例。', facts=facts, boundary=boundary, checkedAt='2026-11-26')})
write('batch.json', dict(updates=patches, creates=[]))
expected = [{**row, **next((patch['data'] for patch in patches if patch['slug'] == row['slug']), {})} for row in before]
write('expected-publication.json', dict(docs=expected))
write('source-reads.json', dict(
    checkedAt='2026-11-26',
    method='CUA rendered DOM/body text; followed hyperlinks from approved detail pages',
    materials=[dict(slug=slug, url=next(row for row in before if row['slug'] == slug)['sources'][0]['url'], visibleRoute='阿合马铁窗集团', linkTarget=shop) for slug in slugs],
    shop=dict(url=shop, pageUpdatedAt='2026-08-30', heading='阿合马铁窗集团', location='幽囚狱', vendor='阿合马', currency='奇巧零食',
        visibleRows=[['永寿幼芽', '奇巧零食×1', '每日15'], ['工造机杼', '奇巧零食×1', '每日15'], ['永寿天华', '奇巧零食×3', '每日5'], ['工造迴轮', '奇巧零食×3', '每日5']],
        publicationBoundary='Only source-labelled shop route, location, vendor and currency published. Numeric prices and limits excluded without second independent verification.'),
    credit=dict(url=credit['sources'][0]['url'], linkedTable=calyx, tableUpdatedAt='2026-02-25',
        visibleClassification={'鸽川区': ['回忆之蕾', '以太之蕾'], '绘世学院': ['藏珍之蕾']},
        visibleRule='共同奖励中的信用点仅限以太之蕾与回忆之蕾；藏珍之蕾无额外信用点。',
        decision='Do not equate location-only credit source with Treasure Bud. Keep both disputed new locations outside the cross-verified list.'),
    secondaryRead=dict(url='https://www.miyoushe.com/sr/article/56044070', author='星海梧桐', section='攻略', publishedAt='2024-08-01', editedAt='2024-08-06',
        visibleBody='该成就获取位置位于幽囚狱；只需与任何一个阿铁马铁窗集团成员买东西即可获得。',
        scope='Historical community text confirms location/existence only. Does not independently verify the four current material rows, currency, prices or limits. Not published as an official source.'),
    sourcePolicy='Existing reviewed BWIKI item detail URLs remain the public citation entry points. Facts explicitly explain the same-site outbound links to supporting tables, whose URLs are recorded here. No new runtime citation URLs, generic domain allowlist, or community authors classified as official.'))
write('source-comparison.json', dict(updates=slugs + ['credit'], independentShopMaterialCrossVerification=False, shopNameResolved=True,
    sameSiteMaterialAndShopAgreement=True, creditConflictResolved=False, creditClassificationClarified=True,
    priorVerifiedRoutesUnchanged=True, pricesLimitsAndLiveStockPublished=False, newPublicSourceURLs=0))
print('Prepared five updates; no creates or new citation URLs.')
