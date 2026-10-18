import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentStatus } from '@/components/content-status';
import { LaunchVerificationBoard } from '@/components/launch-verification-board';
import { launchDayVerification } from '@/lib/data';

export const metadata: Metadata = {
  title: '绿梦：时空之声开服核验台 | Gachia',
  description: '绿梦：时空之声首发周的安装、账号、功能、奖励和资料核验清单。',
  alternates: { canonical: 'https://gachia.com/zh/lvmeng/launch-check' },
};

export default function LaunchCheckPage() {
  return <main id="main-content" tabIndex={-1} className="content">
    <div className="eyebrow">首发周核验事项</div>
    <h1>开服核验台</h1>
    <p className="lead">把首发周需要确认的事实按影响顺序放在一起。它不是预设开荒路线：只有官方公告或当前客户端可复现的信息，才会进入后续的角色、养成、地图和资源攻略。</p>
    <ContentStatus />
    <div className="notice">1.0公测已于2026年10月15日开启，官方已确认三端开放、同账号游戏数据互通和同一UID。开服延迟后已公告恢复；卡池细则、安装包build和个人到账仍须复核。</div>
    <LaunchVerificationBoard tasks={launchDayVerification} />
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
