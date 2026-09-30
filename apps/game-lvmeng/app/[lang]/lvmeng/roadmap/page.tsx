import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentStatus } from '@/components/content-status';
import { contentRoadmap } from '@/lib/data';

export const metadata: Metadata = {
  title: '绿梦：时空之声资料更新计划 | Gachia',
  description: '绿梦：时空之声公测前、开服当天与首周的资料核验和更新计划。',
  alternates: { canonical: 'https://gachia.com/zh/lvmeng/roadmap' },
};

const routeByLabel: Record<string, string> = {
  '预约 / 下载': '/zh/lvmeng/download',
  '公告活动': '/zh/lvmeng/news',
  '常见问题': '/zh/lvmeng/faq',
  '版本动态': '/zh/lvmeng/version',
  '公开角色': '/zh/lvmeng/characters',
  '兑换码': '/zh/lvmeng/redeem-codes',
  '养成资料': '/zh/lvmeng/progression',
  '地图探索': '/zh/lvmeng/map',
  '开荒指南': '/zh/lvmeng/starter-guide',
  '入门与系统': '/zh/lvmeng/guides',
  '开服核验台': '/zh/lvmeng/launch-check',
};

export default function RoadmapPage() {
  return <main className="content">
    <div className="eyebrow">内容治理</div>
    <h1>资料更新计划</h1>
    <p className="lead">公测资料将按公开时间和客户端可复现程度逐步完善。计划页用于说明本站当前优先核验什么，以及对应内容会更新到哪里。</p>
    <ContentStatus />
    <div className="timeline">{contentRoadmap.map((item) => <article className="timeline-item" key={item.phase}><span>{item.status}</span><h2>{item.phase}</h2><p>{item.scope}</p><div className="link-list">{item.destinations.flatMap((destination) => {
      const href = routeByLabel[destination];
      return href ? [<Link key={destination} href={href}>{destination}</Link>] : [];
    })}</div></article>)}</div>
    <h2>发布标准</h2>
    <p>角色数值、装备词条、材料掉落、地图坐标、活动期限与兑换码，均需要官方公告或当前客户端可复核来源。资料会保留核验日期和适用版本；无法确认的信息不会以猜测补全。</p>
    <div className="link-list"><Link href="/zh/lvmeng/launch-check">开服核验台</Link></div>
  </main>;
}
