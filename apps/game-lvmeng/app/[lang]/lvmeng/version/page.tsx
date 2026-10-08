import type { Metadata } from 'next';
import Link from 'next/link';
import { game, launchRewards, previewFollowUpChecklist, versionHistory } from '@/lib/data';

export const metadata: Metadata = { title: '绿梦：时空之声公测准备与版本动态 | Gachia', description: '绿梦：时空之声公测预计时间、版本信息与官方核验状态。', alternates: { canonical: 'https://gachia.com/zh/lvmeng/version' } };

export default function VersionPage() {
  return <main id="main-content" tabIndex={-1} className="content">
    <div className="eyebrow">公测准备</div><h1>版本动态</h1>
    <section className="facts"><div className="fact"><span>状态</span><strong>官方已定档；开服细节待公告</strong></div><div className="fact"><span>日期</span><strong>{game.launchDate}</strong></div><div className="fact"><span>平台</span><strong>{game.platforms.join(' / ')}</strong></div></section>
    <h2>版本时间线</h2><div className="timeline">{versionHistory.map((entry) => <article className="timeline-item" key={entry.version}><span>{entry.date}</span><h3>{entry.version} · {entry.status}</h3><p>{entry.summary}</p></article>)}</div>
    <h2>奖励核验状态</h2><p className="lead">预约里程碑奖励已由官方公告列出；历史登录与测试返还信息不等同于当前首发福利，具体到账条件和领取入口以开服公告为准。</p><div className="grid">{launchRewards.map((reward) => <article className="card" key={reward.item}><h3>{reward.item}</h3><p>{reward.note}</p></article>)}</div>
    <h2>公测前待核验</h2><ul><li>各平台预下载、实际开服时间与安装包入口。</li><li>账号互通、服务器划分、首发版本号与更新说明。</li><li>前瞻节目后公布的首发角色、活动、卡池规则、概率与兑换码。</li></ul>
    <h2>开服前的四项核验</h2><div className="grid">{previewFollowUpChecklist.map((item) => <Link className="card" href={item.href} key={item.title}><span className="tag">{item.status}</span><h3>{item.title}</h3><p>{item.summary}</p></Link>)}</div>
  </main>;
}
