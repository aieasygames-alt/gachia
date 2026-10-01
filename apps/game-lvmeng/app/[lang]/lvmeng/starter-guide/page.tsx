import type { Metadata } from 'next';
import { contentStatus, starterGuideSections } from '@/lib/data';

export const metadata: Metadata = { title: '绿梦：时空之声开荒指南 | Gachia', description: '绿梦：时空之声公测首日开荒与资源规划核验框架。', alternates: { canonical: 'https://gachia.com/zh/lvmeng/starter-guide' } };

export default function StarterGuidePage() {
  return <main id="main-content" tabIndex={-1} className="content">
    <div className="eyebrow">{contentStatus.pending}</div>
    <h1>开荒指南</h1>
    <p className="lead">本页先建立公测首日的核验顺序。角色强度、配队、装备词条与资源效率会在正式客户端确认后再给出具体结论。</p>
    <div className="grid">{starterGuideSections.map((section) => <article className="card" key={section.title}><h3>{section.title}</h3><p>{section.description}</p></article>)}</div>
    <h2>首日资料标准</h2>
    <p>开荒路线将记录适用版本、前置条件、实测时间和官方或客户端来源。不能在当前版本复现的测试期攻略会标注为历史参考，不会作为推荐路线。</p>
  </main>;
}
