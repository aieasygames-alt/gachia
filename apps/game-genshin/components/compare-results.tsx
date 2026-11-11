import Link from 'next/link';
import type { ReactNode } from 'react';
import type { SupportedLocale } from '@gachia/core';
import { resolveBuildEquipment } from '../lib/build-catalog';
import { compareElements, compareName, compareSkillKeys, compareWeaponLabel, type CompareCatalog, type CompareCharacter } from '../lib/compare';
import { text } from '../lib/i18n';

export function CompareResults({ catalog, characters, locale }: { catalog: CompareCatalog; characters: [CompareCharacter, CompareCharacter]; locale: SupportedLocale }) {
  const empty = text(locale, { zh: '暂无资料', en: 'Not available', ja: '資料なし' });
  const group = (id: string, title: string, render: (character: CompareCharacter) => ReactNode) => <section aria-labelledby={`compare-${id}`} data-compare-group={id}>
    <h2 id={`compare-${id}`}>{title}</h2><div className="compare-tool__columns">{characters.map(character => <article key={character.id} data-character={character.id}>
      <h3><Link href={`/${locale}/genshin/characters/${character.id}`}>{compareName(character, locale)}</Link></h3>{render(character)}
    </article>)}</div></section>;
  const skillLabels = {
    normalAttack: { zh: '普通攻击', en: 'Normal Attack', ja: '通常攻撃' },
    elementalSkill: { zh: '元素战技', en: 'Elemental Skill', ja: '元素スキル' },
    elementalBurst: { zh: '元素爆发', en: 'Elemental Burst', ja: '元素爆発' },
  };
  const basics = [
    [text(locale, { zh: '稀有度', en: 'Rarity', ja: 'レアリティ' }), (character: CompareCharacter) => `${character.rarity}★`],
    [text(locale, { zh: '元素', en: 'Element', ja: '元素' }), (character: CompareCharacter) => compareElements[character.element]?.[locale] ?? character.element],
    [text(locale, { zh: '武器类型', en: 'Weapon Type', ja: '武器タイプ' }), (character: CompareCharacter) => compareWeaponLabel(character.weaponType, locale)],
    [text(locale, { zh: '地区', en: 'Region', ja: '地域' }), (character: CompareCharacter) => character.region],
    [text(locale, { zh: '版本', en: 'Version', ja: 'バージョン' }), (character: CompareCharacter) => character.releaseVersion],
    [text(locale, { zh: '获取方式', en: 'Acquisition', ja: '入手方法' }), (character: CompareCharacter) => locale === 'zh' ? character.acquisitionMethod : character.status],
  ] as const;

  return <div className="compare-tool__results">
    {group('tier', text(locale, { zh: '强度评级', en: 'Tier Rating', ja: 'ティア評価' }), character => <>
      <strong className="compare-tool__tier">{character.tierRank || empty}</strong><p>{(locale === 'zh' ? character.tierReasonZh : character.tierReason) || empty}</p>
    </>)}
    {group('skills', text(locale, { zh: '技能对比', en: 'Skills Comparison', ja: 'スキル比較' }), character => <>{compareSkillKeys.map(key => {
      const skill = character.skills?.[key];
      return <div className="compare-tool__entry" key={key} data-skill={key}><h4>{text(locale, skillLabels[key])}</h4>
        {skill ? <><strong>{(locale === 'zh' ? skill.name : skill.nameEn) || empty}</strong><p>{(locale === 'zh' ? skill.description : skill.descriptionEn) || empty}</p>
          <div className="meta">{'cooldown' in skill && skill.cooldown ? <span>CD: {skill.cooldown}</span> : null}{'cost' in skill && skill.cost !== undefined ? <span>{text(locale, { zh: '能量', en: 'Energy', ja: 'エネルギー' })}: {skill.cost}</span> : null}</div>
        </> : <p>{empty}</p>}
      </div>;
    })}</>)}
    {group('build', text(locale, { zh: '配装对比', en: 'Build Comparison', ja: 'ビルド比較' }), character => {
      const build = character.recommendedBuild;
      const weapon = resolveBuildEquipment(catalog.weapons, build?.bestWeaponEn || build?.bestWeapon || '');
      const artifact = resolveBuildEquipment(catalog.artifacts, build?.bestArtifactSetEn || build?.bestArtifactSet || '');
      const stats = (locale === 'zh' ? build?.mainStats : build?.mainStatsEn) ?? {};
      const priorities = (locale === 'zh' ? build?.subStatPriority : build?.subStatPriorityEn) ?? [];
      return <>
        <div className="compare-tool__entry"><h4>{text(locale, { zh: '武器', en: 'Weapon', ja: '武器' })}</h4>{weapon ? <>
          <Link href={`/${locale}/genshin/weapons/${weapon.id}`}>{locale === 'zh' ? weapon.name : weapon.nameEn}</Link>
          <p className="meta">{weapon.rarity}★ · ATK {weapon.baseAtk}</p>
        </> : <p>{(locale === 'zh' ? build?.bestWeapon : build?.bestWeaponEn || build?.bestWeapon) || empty}</p>}</div>
        <div className="compare-tool__entry"><h4>{text(locale, { zh: '圣遗物', en: 'Artifact', ja: '聖遺物' })}</h4>{artifact
          ? <Link href={`/${locale}/genshin/artifacts/${artifact.id}`}>{locale === 'zh' ? artifact.name : artifact.nameEn}</Link>
          : <p>{(locale === 'zh' ? build?.bestArtifactSet : build?.bestArtifactSetEn || build?.bestArtifactSet) || empty}</p>}</div>
        <div className="compare-tool__entry"><h4>{text(locale, { zh: '主属性', en: 'Main Stats', ja: 'メイン' })}</h4>{Object.keys(stats).length
          ? <dl>{Object.entries(stats).map(([slot, stat]) => <div key={slot}><dt>{slot}</dt><dd>{stat || empty}</dd></div>)}</dl> : <p>{empty}</p>}</div>
        <div className="compare-tool__entry"><h4>{text(locale, { zh: '副属性优先级', en: 'Substats', ja: 'サブステータス' })}</h4>{priorities.length
          ? <ol>{priorities.map((stat, index) => <li key={index}>{stat || empty}</li>)}</ol> : <p>{empty}</p>}</div>
      </>;
    })}
    {group('teams', text(locale, { zh: '推荐配队对比', en: 'Team Comps', ja: 'パーティ比較' }), character => character.teamComps?.length ? character.teamComps.slice(0, 3).map((team, index) => <div key={index} className="compare-tool__entry" data-team={index}>
      <h4>{(locale === 'zh' ? team.name : team.nameEn || team.name) || empty}</h4><ul>{team.members.map((member, memberIndex) => {
        const resolved = catalog.characters.find(row => [row.id, row.name, row.nameEn, row.nameJa].includes(member));
        return <li key={memberIndex}>{resolved ? <Link href={`/${locale}/genshin/characters/${resolved.id}`}>{compareName(resolved, locale)}</Link> : member}</li>;
      })}</ul>
    </div>) : <p>{empty}</p>)}
    <section aria-labelledby="compare-basics" data-compare-group="basics"><h2 id="compare-basics">{text(locale, { zh: '基本信息', en: 'Basic Info', ja: '基本情報' })}</h2><table>
      <thead><tr><td></td>{characters.map(character => <th scope="col" key={character.id}>{compareName(character, locale)}</th>)}</tr></thead>
      <tbody>{basics.map(([label, value]) => <tr key={label}><th scope="row">{label}</th>{characters.map(character => <td key={character.id}>{value(character) || empty}</td>)}</tr>)}</tbody>
    </table></section>
  </div>;
}
