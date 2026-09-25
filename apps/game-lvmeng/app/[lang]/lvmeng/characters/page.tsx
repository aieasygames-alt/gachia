import type { Metadata } from 'next';
import Link from 'next/link';
import { communitySources, playableCharacters } from '@/lib/data';

export const metadata: Metadata = { title: '绿梦：时空之声公开角色 | Gachia', description: '绿梦：时空之声已公开角色名单与资料核验边界。', alternates: { canonical: 'https://gachia.com/zh/lvmeng/characters' } };

export default function CharactersPage() { return <main className="content"><div className="eyebrow">官方已公开角色</div><h1>公开角色</h1><p className="lead">以下名单来自官方角色页。页面只记录已公开姓名与设定线索，不把测试期数值、评级或社区配装写成正式服结论。</p><div className="grid">{playableCharacters.map((character) => <Link className="card" key={character.name} href={`/zh/lvmeng/characters/${character.slug}`}><h3>{character.name}</h3><span className="tag">{character.affiliation}</span><p>{character.note}</p><span className="card-link">查看资料页</span></Link>)}</div><h2>资料核验说明</h2><p>官方角色页与社区测试攻略的公开名单可能随版本调整。公测开放后，本站会按客户端角色图鉴、公告与抽取规则补充属性、技能、获取方式及养成材料。</p><ul className="source-list">{communitySources.map((source) => <li key={source.url}><a href={source.url} rel="noreferrer">{source.label}</a>：{source.purpose}</li>)}</ul></main> }
