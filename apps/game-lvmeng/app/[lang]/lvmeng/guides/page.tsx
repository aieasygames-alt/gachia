import type { Metadata } from 'next';
import { ContentStatus } from '@/components/content-status';
import { launchVerificationChecklist, preparationChecklist, systemOverview } from '@/lib/data';

export const metadata: Metadata = { title: '绿梦：时空之声入门与系统 | Gachia', description: '绿梦：时空之声横版动作、探索、队伍援护与开服准备的已核验资料。', alternates: { canonical: 'https://gachia.com/zh/lvmeng/guides' } };

export default function GuidesPage() { return <main className="content"><div className="eyebrow">只收录可核验内容</div><h1>入门与系统</h1><p className="lead">第三方 Wiki 和测试攻略可用于了解玩法方向，但测试版本的数值、角色强度、装备词条与配队不等于公测结论。</p><ContentStatus /><div className="grid">{systemOverview.map((system) => <article className="card" key={system.title}><h3>{system.title}</h3><p>{system.description}</p></article>)}</div><h2>开服前准备</h2><ol className="checklist">{preparationChecklist.map((item) => <li key={item}>{item}</li>)}</ol><h2>公测后优先核验</h2><p>竞品 Wiki 常把测试期经验沉淀为开荒路线。本站将先核验以下基础事实，再补充具体攻略和推荐，避免误导首日资源投入。</p><ol className="checklist">{launchVerificationChecklist.map((item) => <li key={item}>{item}</li>)}</ol><div className="notice">公测后将以游戏内教程、公告和实际客户端资料更新战斗连招、养成、装备、卡池与队伍内容。</div></main> }
