import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { contentStatus, playableCharacters } from '@/lib/data';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const character = playableCharacters.find((entry) => entry.slug === slug);
  if (!character) return {};
  return { title: `${character.name}资料 | 绿梦：时空之声 | Gachia`, description: `${character.name}的官方公开信息与公测后资料补充计划。`, alternates: { canonical: `https://gachia.com/zh/lvmeng/characters/${character.slug}` } };
}

export default async function CharacterDetailPage({ params }: Props) {
  const { slug } = await params;
  const character = playableCharacters.find((entry) => entry.slug === slug);
  if (!character) notFound();
  return <main className="content">
    <div className="eyebrow">{contentStatus.official} · 最后核验：{contentStatus.verifiedAt}</div>
    <h1>{character.name}</h1>
    <section className="facts"><div className="fact"><span>公开状态</span><strong>官方角色页已公开</strong></div><div className="fact"><span>组织 / 线索</span><strong>{character.affiliation}</strong></div><div className="fact"><span>资料状态</span><strong>{contentStatus.pending}</strong></div></section>
    <h2>公开信息</h2>
    <p>{character.note}</p>
    <h2>公测后补充</h2>
    <div className="grid"><article className="card"><h3>角色档案</h3><p>正式身份、背景、语音与客户端图鉴文本。</p></article><article className="card"><h3>战斗资料</h3><p>属性、技能、机制、命座或同类系统的正式名称与说明。</p></article><article className="card"><h3>养成与获取</h3><p>等级、技能、突破材料、获取方式和当前版本适用范围。</p></article></div>
    <p className="notice">本页暂不发布强度评级、毕业装备、配队或抽取建议。上述内容将在公测客户端资料可复核后按版本更新。</p>
    <div className="link-list"><Link href="/zh/lvmeng/progression">查看养成资料</Link><Link href="/zh/lvmeng/version">查看版本动态</Link><Link href="/zh/lvmeng/news">查看官方公告</Link></div>
  </main>;
}
