import type { Metadata } from 'next';
import { contentStatus, mapDirectory } from '@/lib/data';

export const metadata: Metadata = { title: '绿梦：时空之声地图与探索 | Gachia', description: '绿梦：时空之声区域、收集、探索与敌人资料目录。', alternates: { canonical: 'https://gachia.com/zh/lvmeng/map' } };

export default function MapPage() {
  return <main className="content">
    <div className="eyebrow">{contentStatus.pending}</div>
    <h1>地图与探索</h1>
    <p className="lead">地图内容将在公测客户端开放后按区域建设，避免把测试环境中的地图名称、收集坐标或解锁条件当作正式资料。</p>
    <div className="grid">{mapDirectory.map((item) => <article className="card" key={item.title}><span className="tag">{item.status}</span><h3>{item.title}</h3><p>{item.description}</p></article>)}</div>
    <h2>收录边界</h2>
    <p>每条探索资料会标明区域、版本、前置任务和复核日期。需要随机刷新、限时活动或多人条件的内容将单独标注，方便后续维护。</p>
  </main>;
}
