import type { Metadata } from 'next';
import Link from 'next/link';
import { contentStatus, officialAnnouncements, officialEntryPoints, previewFollowUpChecklist } from '@/lib/data';

export const metadata: Metadata = { title: '绿梦：时空之声公告与活动 | Gachia', description: '绿梦：时空之声官方公告、活动与奖励核验状态。', alternates: { canonical: 'https://gachia.com/zh/lvmeng/news' } };

export default function NewsPage() {
  return <main id="main-content" tabIndex={-1} className="content">
    <div className="eyebrow">最后核验：{contentStatus.verifiedAt}</div>
    <h1>公告与活动</h1>
    <p className="lead">优先整理官方公告中的公测、维护、活动、奖励与兑换信息。社区转述不会单独作为本站活动结论。</p>
    <div className="grid">{officialAnnouncements.map((announcement) => <article className="card" key={announcement.title}><span className="tag">{announcement.status} · {announcement.date}</span><h3>{announcement.title}</h3><p>{announcement.summary}</p><a className="card-link" href={announcement.url} rel="noreferrer">查看官方来源</a></article>)}</div>
    <h2>公测后更新顺序</h2>
    <ol className="checklist"><li>先记录当前版本、恢复或维护公告、平台下载入口与账号规则。</li><li>再单独核对卡池名称、概率、保底、活动期限、预约奖励与测试返还入口，避免合并计算。</li><li>最后用开服客户端复核角色、BOSS、地图和战斗机制；预告演示不替代可复现的正式资料。</li></ol>
    <h2>公测公告核验清单</h2>
    <p className="lead">前瞻内容、应用商店状态与开服客户端可能在不同时间更新。以下入口按“先能否进入游戏，再决定资源投入”的顺序组织。</p>
    <div className="grid">{previewFollowUpChecklist.map((item) => <article className="card" key={item.title}><span className="tag">{item.status}</span><h3>{item.title}</h3><p>{item.summary}</p><Link className="card-link" href={item.href}>进入核验页</Link></article>)}</div>
    <h2>官方入口索引</h2>
    <div className="grid">{officialEntryPoints.map((entry) => <article className="card" key={entry.url}><h3>{entry.label}</h3><p>{entry.purpose}</p><a className="card-link" href={entry.url} rel="noreferrer">打开入口</a></article>)}</div>
    <h2>公测后更新规则</h2>
    <p>每项活动会标注开始时间、结束时间、适用平台、参与条件、奖励与官方来源。官方未明确的信息将保持“待核验”，不以测试服截图、前瞻转述或搬运内容填充。</p>
    <div className="link-list"><Link href="/zh/lvmeng/roadmap">查看资料更新计划</Link><Link href="/zh/lvmeng/version">查看版本动态</Link></div>
  </main>;
}
