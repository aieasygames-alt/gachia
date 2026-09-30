import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentStatus } from '@/components/content-status';
import { launchDayVerification } from '@/lib/data';

export const metadata: Metadata = {
  title: '绿梦：时空之声开服核验台 | Gachia',
  description: '绿梦：时空之声开服当天的安装、账号、功能、奖励和资料核验清单。',
  alternates: { canonical: 'https://gachia.com/zh/lvmeng/launch-check' },
};

export default function LaunchCheckPage() {
  return <main className="content">
    <div className="eyebrow">开服当天优先事项</div>
    <h1>开服核验台</h1>
    <p className="lead">把首日需要确认的事实按影响顺序放在一起。它不是预设开荒路线：只有官方公告或当前客户端可复现的信息，才会进入后续的角色、养成、地图和资源攻略。</p>
    <ContentStatus />
    <div className="notice">App Store 页面显示的 2026 年 10 月 31 日仅为预计推出日期。预下载、实际开服时间、平台同步、账号互通、卡池和奖励都必须以最新官网或官方 TapTap 公告复核。</div>
    <section className="grid">{launchDayVerification.map((item, index) => <Link className="card" href={item.href} key={item.id}>
      <span className="tag">{index + 1}. {item.status}</span>
      <h3>{item.title}</h3>
      <p>{item.summary}</p>
      <p className="card-link">核验动作：{item.action}</p>
    </Link>)}</section>
    <h2>推荐顺序</h2>
    <ol className="checklist">
      <li>先确认官方入口、客户端版本和实际开服状态，再开始下载或创建角色。</li>
      <li>确认账号、服务器与互通规则，再领取奖励或进行任何付费与资源投入。</li>
      <li>完成正式客户端教学，核对功能开放条件后再规划角色、抽取与探索。</li>
      <li>将测试攻略只作为问题清单；当前版本可复现的结果才纳入资料站结论。</li>
    </ol>
    <div className="link-list"><Link href="/zh/lvmeng/download">预约 / 下载</Link><Link href="/zh/lvmeng/news">官方公告</Link><Link href="/zh/lvmeng/redeem-codes">兑换码状态</Link><Link href="/zh/lvmeng/roadmap">资料更新计划</Link></div>
  </main>;
}
