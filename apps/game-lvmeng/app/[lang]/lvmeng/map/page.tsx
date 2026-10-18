import type { Metadata } from 'next';
import { contentStatus, mapDirectory } from '@/lib/data';
import { PatchNotice } from '@/components/patch-notice';

export const metadata: Metadata = { title: '绿梦：时空之声地图与探索 | Gachia', description: '绿梦：时空之声区域、收集、探索与敌人资料目录。', alternates: { canonical: 'https://gachia.com/zh/lvmeng/map' } };

export default function MapPage() {
  return <main id="main-content" tabIndex={-1} className="content">
    <div className="eyebrow">{contentStatus.pending}</div>
    <h1>地图与探索</h1>
    <p className="lead">1.0已公测。本页先整理官方确认的探索修复与回访注意事项；当前版本坐标、完整收集路线和解锁条件尚未完成客户端实测，不照搬旧测试攻略。</p>
    <div className="grid">{mapDirectory.map((item) => <article className="card" key={item.title}><span className="tag">{item.status}</span><h3>{item.title}</h3><p>{item.description}</p></article>)}</div>
    <PatchNotice />
    <h2>收录边界</h2>
    <p>每条探索资料会标明区域、版本、前置任务和复核日期。需要随机刷新、限时活动或多人条件的内容将单独标注，方便后续维护。</p>
  </main>;
}
