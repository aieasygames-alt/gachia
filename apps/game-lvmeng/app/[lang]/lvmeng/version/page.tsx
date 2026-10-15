import type { Metadata } from 'next';
import Link from 'next/link';
import { game, launchRewards, previewFollowUpChecklist, versionHistory } from '@/lib/data';

export const metadata: Metadata = { title: '绿梦：时空之声1.0公测与版本动态 | Gachia', description: '绿梦：时空之声公测状态、版本信息与官方核验状态。', alternates: { canonical: 'https://gachia.com/zh/lvmeng/version' } };

export default function VersionPage() {
  return <main id="main-content" tabIndex={-1} className="content">
    <div className="eyebrow">1.0公测</div><h1>版本动态</h1>
    <section className="facts"><div className="fact"><span>状态</span><strong>1.0公测已开启</strong></div><div className="fact"><span>日期</span><strong>{game.launchDate}</strong></div><div className="fact"><span>平台</span><strong>{game.platforms.join(' / ')}</strong></div></section>
    <h2>版本时间线</h2><div className="timeline">{versionHistory.map((entry) => <article className="timeline-item" key={entry.version}><span>{entry.date}</span><h3>{entry.version} · {entry.status}</h3><p>{entry.summary}</p></article>)}</div>
    <h2>奖励核验状态</h2><p className="lead">预约里程碑奖励已由官方公告列出；历史登录与测试返还信息不等同于当前首发福利，具体到账条件和领取入口以开服公告为准。</p><div className="grid">{launchRewards.map((reward) => <article className="card" key={reward.item}><h3>{reward.item}</h3><p>{reward.note}</p></article>)}</div>
    <h2>正式客户端仍待核验</h2><ul><li>安装包build号、当前维护和个人账号登录状态。</li><li>渠道账号、充值余额与服务器规则；同账号游戏数据互通已经确认。</li><li>完整首发角色、卡池规则、概率、保底与有效兑换码。</li></ul>
    <h2>公测后的四项核验</h2><div className="grid">{previewFollowUpChecklist.map((item) => <Link className="card" href={item.href} key={item.title}><span className="tag">{item.status}</span><h3>{item.title}</h3><p>{item.summary}</p></Link>)}</div>
  </main>;
}
