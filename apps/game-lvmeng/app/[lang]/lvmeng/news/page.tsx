import type { Metadata } from 'next';
import { contentStatus, officialAnnouncements } from '@/lib/data';

export const metadata: Metadata = { title: '绿梦：时空之声公告与活动 | Gachia', description: '绿梦：时空之声官方公告、活动与奖励核验状态。', alternates: { canonical: 'https://gachia.com/zh/lvmeng/news' } };

export default function NewsPage() {
  return <main className="content">
    <div className="eyebrow">最后核验：{contentStatus.verifiedAt}</div>
    <h1>公告与活动</h1>
    <p className="lead">优先整理官方公告中的公测、维护、活动、奖励与兑换信息。社区转述不会单独作为本站活动结论。</p>
    <div className="grid">{officialAnnouncements.map((announcement) => <article className="card" key={announcement.title}><span className="tag">{announcement.status} · {announcement.date}</span><h3>{announcement.title}</h3><p>{announcement.summary}</p><a className="card-link" href={announcement.url} rel="noreferrer">查看官方来源</a></article>)}</div>
    <h2>公测后更新规则</h2>
    <p>每项活动会标注开始时间、结束时间、适用平台、参与条件、奖励与官方来源。官方未明确的信息将保持“待核验”，不以测试服截图或搬运内容填充。</p>
  </main>;
}
