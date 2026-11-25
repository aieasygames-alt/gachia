import json,pathlib,hashlib
from urllib.parse import quote
root=pathlib.Path(__file__).resolve().parent
official='https://act.mihoyo.com/puzzle/hkrpg/e20261024version_2142940ddd/index.html'
def bw(n):return 'https://wiki.biligame.com/sr/'+quote(n,safe='')
def doc(slug,title,summary,facts,boundary,sources):return dict(gameId='starrail',locale='zh',kind='equipment',slug=slug,title=title,summary=summary,region='4.7装备资料；国服名称，第三方数值参考',checkedAt='2026-11-25',facts=[{'text':f} for f in facts],boundary=boundary,sources=[{'url':u} for u in sources],_status='published')
cone=doc('when-the-first-aha-rang-out','当第一声「阿哈」响起：叠影效果与晋阶材料','5星欢愉光锥，收录叠影1—5的基础速度、笑点与全队无视防御效果，80级面板及六次晋阶消耗。',[
 '装备身份与面板\n5星，欢愉命途；技能名「即兴巡演」。BWIKI列出的80级面板为生命值952、攻击力582、防御力529，1级面板为43、26、24。这里采用百科整数显示值，不据此推导隐藏精度。',
 '触发方式与持续范围\n以下技能效果仅对欢愉命途生效。对我方其他单体施放战技时获得笑点，每间隔1回合最多触发1次；随后使我方全体在本场战斗中造成伤害时无视目标防御力，该效果无法叠加。基础速度加成为点数，不是百分比。',
 *[f'叠影{i+1}\n装备者基础速度提高{spd}点；满足上述战技条件时获得{pts}个笑点；随后我方全体在本场战斗中造成伤害时无视敌方目标{defense}%的防御力。' for i,(spd,pts,defense) in enumerate(zip([12,14,16,18,20],[10,12,14,16,18],[16,18,20,22,24]))],
 '获取与当前窗口\n获取类型为限定跃迁。国服4.7专题列出本轮为2026/11/11更新后至2026/12/22 15:00，不随12月2日复刻切换结束。专题原文未标注时区；其他区服须独立核对。',
 '20级与30级晋阶\n20级：童真蜡笔×8、信用点×5,000。\n30级：《绒绒号》手绘分镜稿×4、童真蜡笔×12、信用点×10,000。',
 '40级与50级晋阶\n40级：《绒绒号》连载纪念刊×4、造梦蘸钢×8、信用点×20,000。\n50级：《绒绒号》连载纪念刊×8、造梦蘸钢×12、信用点×50,000。',
 '60级与70级晋阶\n60级：《绒绒号》典藏版合集×5、梦现管锥×6、信用点×100,000。\n70级：《绒绒号》典藏版合集×10、梦现管锥×8、信用点×200,000。',
 '六次晋阶合计\n信用点×385,000；童真蜡笔×20、造梦蘸钢×20、梦现管锥×14；《绒绒号》手绘分镜稿×4、连载纪念刊×12、典藏版合集×15。该合计仅为晋阶，排除光锥升级经验与喂经验信用点、叠影获取成本，也不并入阿哈角色材料计算器。',
 ],'叠影数值、整数面板与晋阶材料据BWIKI具体详情页整理，尚未完成第二独立数值源交叉核验，不标为官方逐项确认或实测。官方专题仅核对名称、命途及跃迁窗口。无视防御不能直接等同同百分比最终增伤；本页不据同命途推导适配、替代品或抽取优先级。窗口为2026/11/25核验记录，当前剩余时间以游戏内为准。',[bw('当第一声「阿哈」响起'),official])
a=doc('gods-momentary-bliss','神的瞬息欢愉：两件套效果与触发门槛','4.7位面饰品：速度提高6%；欢愉度≥40%时，进入战斗立刻行动提前40%。',[
 '两件套效果\n装备者速度提高6%。当装备者的欢愉度大于等于40%时，进入战斗时立刻使行动提前40%。',
 '门槛与时间点\n门槛是欢愉度≥40%，包含等于40%的情况。行动提前发生在进入战斗时；套装文本未写每回合触发，不将其解释为常驻40%速度加成。',
 '部件\n位面球「瞬息欢愉的永恒舞台」；连结绳「瞬息欢愉的魔术道具」。这是两部件位面饰品，不存在四件套效果。',
 '获取途径\n官方4.7专题确认挑战差分宇宙新关卡可获得该套装；BWIKI亦列获取途径为差分宇宙。本页未核准具体关卡标题、解锁条件与各难度掉落数量。',
 ],'数值与门槛已对照Star Rail Station及BWIKI一致；官方专题只确认4.7新增与差分宇宙获取。未完成角色配装比较、实测收益及具体关卡掉落核验，不据相关角色标签宣称毕业套装。',[ 'https://starrailstation.com/cn/relics/329',bw('神的瞬息欢愉'),official])
b=doc('subspace-sanctuary','亚空异容所：两件套效果与速度门槛','4.7位面饰品：速度提高6%；速度≥145时，进入战斗后使全队击破特攻提高18%，无法叠加。',[
 '两件套效果\n装备者速度提高6%。当装备者的速度大于等于145时，进入战斗后使我方全体击破特攻提高18%，该效果无法叠加。',
 '门槛与作用对象\n速度门槛为≥145，包含等于145的情况；18%提高的是我方全体击破特攻。无法叠加的限制属于该效果，不将多名角色携带直接相加为36%。',
 '部件\n位面球「异容所的深黯裂隙」；连结绳「异容所的负向胶卷」。这是两部件位面饰品，不存在四件套效果。',
 '获取途径\n官方4.7专题确认挑战差分宇宙新关卡可获得该套装；BWIKI亦列获取途径为差分宇宙。本页未核准具体关卡标题、解锁条件与各难度掉落数量。',
 ],'数值与门槛已对照Star Rail Station及BWIKI一致；官方专题只确认4.7新增与差分宇宙获取。击破特攻加成不直接等于最终伤害提高18%；未核验配装优先级、具体关卡掉落或战斗中速度变化的再次判定机制。',['https://starrailstation.com/cn/relics/330',bw('亚空异容所'),official])
(root/'batch.json').write_text(json.dumps({'updates':[],'creates':[cone,a,b]},ensure_ascii=False,indent=2)+'\n')
evidence=[]
for file,url in [('source-1.html','https://starrailstation.com/cn/relics/329'),('source-2.html','https://starrailstation.com/cn/relics/330'),('source-3.html',bw('当第一声「阿哈」响起')),('source-4.html',bw('神的瞬息欢愉')),('source-5.html',bw('亚空异容所'))]:
 data=(root/'.private'/file).read_bytes();evidence.append(dict(url=url,status=200,bytes=len(data),sha256=hashlib.sha256(data).hexdigest()))
(root/'source-comparison.json').write_text(json.dumps({'checkedAt':'2026-11-25','sources':evidence,'agreement':['两套位面饰品效果、门槛与部件名称一致'],'limitations':['光锥数值与晋阶仅BWIKI单一数值源，前台明确披露；官方仅核对身份与窗口','不使用攻略正文、故事或竞品图片','具体差分宇宙关卡标题与掉落未核验']},ensure_ascii=False,indent=2)+'\n')
