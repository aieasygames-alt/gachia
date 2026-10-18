import type { Metadata } from 'next';
import { contentStatus, firstWeekRoute, rewardsSource, starterGuideSections } from '@/lib/data';

export const metadata: Metadata = { title: '绿梦：时空之声开荒指南 | Gachia', description: '绿梦：时空之声公测首日开荒与资源规划核验框架。', alternates: { canonical: 'https://gachia.com/zh/lvmeng/starter-guide' } };

export default function StarterGuidePage() {
  return <main id="main-content" tabIndex={-1} className="content">
    <div className="eyebrow">{contentStatus.pending}</div>
    <h1>开荒指南</h1>
    <p className="lead">本页根据官方启程活动整理首日行动顺序，尚未进行客户端完整路线实测。角色强度、配队、装备词条与资源效率会在正式客户端确认后再给出具体结论。</p>
    <h2>首日、次日与首周行动表</h2>
    <div className="grid">{firstWeekRoute.map((item) => <article className="card" key={item.title}><span className="tag">{item.status}</span><h3>{item.title}</h3><ol>{item.steps.map((step) => <li key={step}>{step}</li>)}</ol></article>)}</div>
    <div className="grid">{starterGuideSections.map((section) => <article className="card" key={section.title}><h3>{section.title}</h3><p>{section.description}</p></article>)}</div>
    <p><a href={rewardsSource} rel="noreferrer">查看启程活动官方来源</a></p><h2>首日资料标准</h2>
    <p>开荒路线将记录适用版本、前置条件、实测时间和官方或客户端来源。不能在当前版本复现的测试期攻略会标注为历史参考，不会作为推荐路线。</p>
  </main>;
}
