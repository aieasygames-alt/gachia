import type { Metadata } from 'next';
import { VerificationChecklist } from '@/components/verification-checklist';
import { contentStatus, progressionDirectory } from '@/lib/data';

export const metadata: Metadata = { title: '绿梦：时空之声养成资料 | Gachia', description: '绿梦：时空之声角色、装备、材料与货币资料库规划。', alternates: { canonical: 'https://gachia.com/zh/lvmeng/progression' } };

export default function ProgressionPage() {
  return <main id="main-content" tabIndex={-1} className="content">
    <div className="eyebrow">{contentStatus.pending}</div>
    <h1>养成资料</h1>
    <p className="lead">养成资料库会以正式客户端图鉴和活动说明为基础建立角色、装备、材料与货币之间的关系，为后续材料规划和构筑工具提供准确数据。</p>
    <div className="grid">{progressionDirectory.map((item) => <article className="card" key={item.title}><span className="tag">{item.status}</span><h3>{item.title}</h3><p>{item.description}</p></article>)}</div>
    <VerificationChecklist />
    <h2>数据发布条件</h2>
    <p>数值、掉落和消耗必须能在当前客户端或官方公告中复核。版本更替后会保留旧数据的适用范围，不覆盖历史记录。</p>
  </main>;
}
