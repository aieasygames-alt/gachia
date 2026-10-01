import type { Metadata } from 'next';
import { contentStatus, publicWorldSources, sourcePolicy, worldGlossary } from '@/lib/data';

export const metadata: Metadata = {
  title: '绿梦：时空之声世界观与术语 | Gachia',
  description: '绿梦：时空之声已公开世界观术语与资料核验边界。',
  alternates: { canonical: 'https://gachia.com/zh/lvmeng/world' },
};

export default function WorldPage() {
  return <main id="main-content" tabIndex={-1} className="content">
    <div className="eyebrow">公开设定整理</div>
    <h1>世界观与术语</h1>
    <p className="lead">竞品 Wiki 通常会先建立术语、势力和地图的检索入口。以下仅整理官方页面与公开背景资料已经出现的名称，不补写未公开的剧情、角色关系或机制。</p>
    <div className="grid">{worldGlossary.map((entry) => <article className="card" key={entry.term}><h3>{entry.term}</h3><p>{entry.description}</p></article>)}</div>
    <h2>资料等级</h2>
    <div className="grid">{sourcePolicy.map((policy) => <article className="card" key={policy.level}><span className="tag">{policy.level}</span><p>{policy.description}</p></article>)}</div>
    <h2>资料使用边界</h2>
    <p>世界观信息会随主线、角色档案和版本活动逐步公开。本站在公测后将以客户端图鉴、主线文本与官方公告为基础补充势力、区域、敌人和故事时间线；第三方整理仅用于发现待核验的主题。当前页面最后核验日期为 {contentStatus.verifiedAt}。</p>
    <ul className="source-list">{publicWorldSources.map((source) => <li key={source.url}><a href={source.url} rel="noreferrer">{source.label}</a>：{source.purpose}</li>)}</ul>
  </main>;
}
