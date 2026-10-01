import Link from 'next/link';
import type { SupportedLocale } from '@gachia/core';
import { characterBuilds, characterName, getNteWeaponName, nteCharacterSummaries, nteWeapons } from '@/lib/data';
import { NteNav } from '@/components/nte-nav';
import { nteMetadata } from '@/lib/metadata';


const copy = {
  zh: { title: '异环角色配装推荐', description: '基于已收录角色方案的异环武器、主词条、副词条与配队参考。', lead: '本页仅展示已有资料来源明确记录的角色方案。选择前请结合自己的武器、队伍循环和战斗环境复核。', documented: '已收录方案', character: '角色', weapon: '推荐武器', mainStat: '主词条', subStats: '副词条优先级', team: '推荐队友', notes: '配装说明', related: '继续规划', allCharacters: '全部角色资料', weapons: '武器图鉴', disks: '驱动盘图鉴', teams: '配队规划' },
  en: { title: 'NTE Character Builds', description: 'NTE weapon, main-stat, substat, and team references based on documented character builds.', lead: 'This page only shows character builds explicitly present in the available source data. Recheck them against your weapons, rotation, and encounter.', documented: 'documented builds', character: 'Character', weapon: 'Recommended weapon', mainStat: 'Main stat', subStats: 'Substat priority', team: 'Recommended teammates', notes: 'Build notes', related: 'Keep planning', allCharacters: 'All characters', weapons: 'Weapons', disks: 'Disk sets', teams: 'Team planning' },
  ja: { title: 'NTE キャラビルド', description: '収録済みのキャラクタービルドに基づく武器、メインステータス、サブステータス、編成の参考です。', lead: 'このページでは、利用可能な資料に明記されたキャラクタービルドのみを掲載しています。所持武器、ローテーション、戦闘環境に合わせて確認してください。', documented: '収録ビルド', character: 'キャラクター', weapon: 'おすすめ武器', mainStat: 'メインステータス', subStats: 'サブステータス優先度', team: 'おすすめメンバー', notes: 'ビルドメモ', related: '次の計画', allCharacters: '全キャラクター', weapons: '武器図鑑', disks: 'ディスクセット', teams: 'パーティ編成' },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const locale = (await params).lang as SupportedLocale;
  return nteMetadata(locale, 'build', { zh: copy.zh.title, en: copy.en.title, ja: copy.ja.title }, { zh: copy.zh.description, en: copy.en.description, ja: copy.ja.description });
}

export default async function Build({ params }: { params: Promise<{ lang: string }> }) {
  const locale = (await params).lang as SupportedLocale;
  const text = copy[locale] ?? copy.en;
  const entries = characterBuilds.flatMap(({ characterId, builds }) => builds.map((build) => ({ characterId, build }))).filter(({ characterId }) => nteCharacterSummaries.some((character) => character.id === characterId));
  const pathname = `/${locale}/nte/build`;
  const jsonLd = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Gachia', item: 'https://gachia.com' }, { '@type': 'ListItem', position: 2, name: 'NTE', item: `https://gachia.com/${locale}/nte` }, { '@type': 'ListItem', position: 3, name: text.title, item: `https://gachia.com${pathname}` }] },
    { '@type': 'CollectionPage', name: text.title, description: text.description, url: `https://gachia.com${pathname}`, inLanguage: locale === 'zh' ? 'zh-CN' : locale },
  ] };
  return <><NteNav locale={locale} /><main id="main-content" tabIndex={-1} className="content"><div className="eyebrow">NTE Builds</div><h1>{text.title}</h1><p className="lead">{text.lead}</p><div className="stat-row"><strong>{entries.length}</strong><span>{text.documented}</span><strong>{nteCharacterSummaries.length}</strong><span>{text.character}</span></div><section className="skill-list">{entries.map(({ characterId, build }) => {
    const character = nteCharacterSummaries.find((item) => item.id === characterId)!;
    const weapons = build.recommendedWeapons.map((id) => nteWeapons.find((weapon) => weapon.id === id)).filter(Boolean);
    const teammates = build.teamComp.map((id) => nteCharacterSummaries.find((item) => item.id === id)).filter(Boolean);
    const title = locale === 'zh' ? build.name : build.nameEn;
    const description = locale === 'zh' ? build.description : build.descriptionEn;
    const mainStat = locale === 'zh' ? build.mainStat : build.mainStatEn;
    const subStats = locale === 'zh' ? build.subStats : build.subStatsEn;
    const notes = locale === 'zh' ? build.notes : build.notesEn;
    return <article className="card" key={build.id} lang={locale === 'ja' ? 'en' : undefined}><div className="card__meta"><Link href={`/${locale}/nte/characters/${characterId}`}>{characterName(character, locale)}</Link> · {character.attribute ?? ''} · {character.rank ?? ''}</div><h2 className="card__title">{title}</h2><p>{description}</p><div className="detail-meta"><span><strong>{text.mainStat}:</strong> {mainStat}</span><span><strong>{text.subStats}:</strong> {subStats.join(' · ')}</span></div>{weapons.length > 0 && <p><strong>{text.weapon}:</strong> {weapons.map((weapon) => weapon && <Link key={weapon.id} href={`/${locale}/nte/weapons/${weapon.id}`}>{getNteWeaponName(weapon, locale)}</Link>).reduce<React.ReactNode[]>((items, weapon, index) => index ? [...items, ' · ', weapon] : [weapon], [])}</p>}{teammates.length > 0 && <p><strong>{text.team}:</strong> {teammates.map((member) => member && <Link key={member.id} href={`/${locale}/nte/characters/${member.id}`}>{characterName(member, locale)}</Link>).reduce<React.ReactNode[]>((items, member, index) => index ? [...items, ' · ', member] : [member], [])}</p>}<p><strong>{text.notes}:</strong> {notes}</p></article>;
  })}</section><section className="detail-section"><h2>{text.related}</h2><div className="link-list"><Link href={`/${locale}/nte/characters`}>{text.allCharacters}</Link><Link href={`/${locale}/nte/weapons`}>{text.weapons}</Link><Link href={`/${locale}/nte/disk-sets`}>{text.disks}</Link><Link href={`/${locale}/nte/teams`}>{text.teams}</Link></div></section></main><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
}
