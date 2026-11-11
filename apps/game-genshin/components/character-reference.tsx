import Link from 'next/link';
import type { ReactNode } from 'react';
import type { SupportedLocale } from '@gachia/core';
import type { GenshinCharacter } from '@gachia/data/games/genshin/types';
import { getMaterialsForCharacter } from '@gachia/data/games/genshin/extras';
import { getRegionById, getRegionName } from '@gachia/data/games/genshin/regions';
import { getGenshinCharacterTierReason } from '@gachia/data/games/genshin/characters';
import { artifactSets, genshinWeapons, getGenshinCharacterById, getGenshinCharacterName, getGenshinMaterialById, getGenshinMaterialName } from '@/lib/data';
import { text } from '@/lib/i18n';

export function characterFaqEntries(character: GenshinCharacter, locale: SupportedLocale) {
  return (character.faq ?? []).map(faq => locale === 'zh' ? [faq.questionZh, faq.answerZh] : [faq.question, faq.answer]);
}

export function CharacterReference({ character, locale }: { character: GenshinCharacter; locale: SupportedLocale }) {
  const build = character.recommendedBuild;
  const region = getRegionById(character.region);
  const voice = locale === 'zh' ? character.cvZh : locale === 'ja' ? character.cvJp : character.cvEn;
  const teams = character.teamComps ?? [];
  const related = character.relatedCharacters ?? [];
  const acquisitionLabels: Record<string, Record<SupportedLocale, string>> = {
    'limited-banner': { zh: '限定祈愿', en: 'Limited Banner', ja: '限定祈願' },
    standard: { zh: '常驻祈愿', en: 'Standard Banner', ja: '通常祈願' },
    free: { zh: '免费获取', en: 'Free', ja: '無料入手' },
  };
  const acquisition = acquisitionLabels[character.acquisitionMethod];
  const equipment = (name: string, category: 'weapons' | 'artifacts') => {
    const item = (category === 'weapons' ? genshinWeapons : artifactSets).find(row =>
      row.id === name || row.name.toLowerCase() === name.toLowerCase() || row.nameEn.toLowerCase() === name.toLowerCase());
    return item ? <Link href={`/${locale}/genshin/${category}/${item.id}`}>{name}</Link> : <span>{name}</span>;
  };
  const buildRows: Array<{ label: string; values: ReactNode[] }> = build ? [
    { label: text(locale, { zh: '最佳武器', en: 'Best Weapon', ja: '推奨武器' }), values: [locale === 'zh' ? build.bestWeapon : build.bestWeaponEn].filter(Boolean).map(name => equipment(name, 'weapons')) },
    { label: text(locale, { zh: '备选武器', en: 'Alternative Weapons', ja: '代替武器' }), values: (build.alternativeWeapons ?? []).filter(Boolean).map(name => equipment(name, 'weapons')) },
    { label: text(locale, { zh: '圣遗物套装', en: 'Artifact Set', ja: '聖遺物セット' }), values: [locale === 'zh' ? build.bestArtifactSet : build.bestArtifactSetEn].filter(Boolean).map(name => equipment(name, 'artifacts')) },
    { label: text(locale, { zh: '备选套装', en: 'Alternative Set', ja: '代替セット' }), values: [locale === 'zh' ? build.alternativeArtifactSet : build.alternativeArtifactSetEn].filter((name): name is string => Boolean(name)).map(name => equipment(name, 'artifacts')) },
    { label: text(locale, { zh: '主属性', en: 'Main Stats', ja: 'メインステータス' }), values: Object.entries((locale === 'zh' ? build.mainStats : build.mainStatsEn) ?? {}).map(([slot, value]) => <span><span>{slot}</span>: <span>{value}</span></span>) },
    { label: text(locale, { zh: '副属性优先', en: 'Sub Stat Priority', ja: 'サブステータス優先度' }), values: ((locale === 'zh' ? build.subStatPriority : build.subStatPriorityEn) ?? []).filter(Boolean).map(value => <span>{value}</span>) },
  ].filter(row => row.values.length) : [];
  const materials = getMaterialsForCharacter(character.id);
  const materialGroups = [
    { name: text(locale, { zh: '角色突破', en: 'Character Ascension', ja: 'キャラ突破' }), rows: materials?.ascensionMaterials.map(row => ({ level: row.levelRange, materials: row.materials })) ?? [] },
    { name: text(locale, { zh: '天赋升级', en: 'Talent Upgrade', ja: '天賦育成' }), rows: materials?.talentMaterials.map(row => ({ level: row.talentLevel, materials: row.materials })) ?? [] },
  ].filter(group => group.rows.length);
  const characterLink = (id: string) => {
    const member = getGenshinCharacterById(id);
    return member ? <Link href={`/${locale}/genshin/characters/${id}`}>{getGenshinCharacterName(member, locale)}</Link> : <span>{id}</span>;
  };
  const faqs = characterFaqEntries(character, locale);
  return <>
    <section id="character-profile">
      <h2>{text(locale, { zh: '角色资料', en: 'Character Profile', ja: 'キャラ資料' })}</h2>
      <dl className="character-reference__rows">
        <div><dt>{text(locale, { zh: '地区', en: 'Region', ja: '地域' })}</dt><dd>{region ? getRegionName(region, locale) : character.region}</dd></div>
        <div><dt>{text(locale, { zh: '获取方式', en: 'Acquisition', ja: '入手方法' })}</dt><dd>{acquisition ? text(locale, acquisition) : character.acquisitionMethod}</dd></div>
        <div><dt>{text(locale, { zh: '实装版本', en: 'Release Version', ja: '実装バージョン' })}</dt><dd>{character.releaseVersion}</dd></div>
        {voice && <div><dt>CV</dt><dd>{voice}</dd></div>}
        {character.tierRank && <div><dt>{text(locale, { zh: '强度参考', en: 'Tier Reference', ja: '評価参考' })}</dt><dd>{character.tierRank}</dd></div>}
      </dl>
      {getGenshinCharacterTierReason(character, locale) && <p>{getGenshinCharacterTierReason(character, locale)}</p>}
    </section>
    {buildRows.length > 0 && <section id="recommended-build">
      <h2>{text(locale, { zh: '推荐配装', en: 'Recommended Build', ja: 'おすすめビルド' })}</h2>
      <dl className="character-reference__rows">{buildRows.map(row => <div key={row.label}><dt>{row.label}</dt><dd><ol className="character-reference__values">{row.values.map((value, index) => <li key={index}>{value}</li>)}</ol></dd></div>)}</dl>
    </section>}
    {teams.length > 0 && <section id="team-compositions">
      <h2>{text(locale, { zh: '推荐配队', en: 'Team Compositions', ja: 'おすすめパーティ' })}</h2>
      {teams.map((team, index) => <article className="character-reference__entry" key={index}>
        <h3>{locale === 'zh' ? team.name : team.nameEn}</h3><p>{locale === 'zh' ? team.description : team.descriptionEn}</p>
        <ul className="character-reference__values">{team.members.map((id, member) => <li key={`${id}-${member}`}>{characterLink(id)}</li>)}</ul>
      </article>)}
    </section>}
    {materialGroups.length > 0 && <section id="character-materials">
      <h2>{text(locale, { zh: '养成材料', en: 'Ascension Materials', ja: '育成素材' })}</h2>
      {materialGroups.map(group => <div key={group.name}><h3>{group.name}</h3><div className="character-reference__table">
        <table><caption>{group.name}</caption><thead><tr><th scope="col">{text(locale, { zh: '等级', en: 'Level', ja: 'レベル' })}</th><th scope="col">{text(locale, { zh: '材料', en: 'Materials', ja: '素材' })}</th></tr></thead>
          <tbody>{group.rows.map((row, index) => <tr key={`${row.level}-${index}`}><th scope="row">{row.level}</th><td><ul className="character-reference__values">{row.materials.map((item, materialIndex) => {
            const material = getGenshinMaterialById(item.id);
            return <li key={`${item.id}-${materialIndex}`}>{material ? <Link href={`/${locale}/genshin/items/${item.id}`}>{getGenshinMaterialName(material, locale)}</Link> : <span>{item.id}</span>} <span aria-hidden="true">×</span> <span>{item.quantity}</span></li>;
          })}</ul></td></tr>)}</tbody>
        </table>
      </div></div>)}
    </section>}
    {faqs.length > 0 && <section id="character-faq">
      <h2>{text(locale, { zh: '角色常见问题', en: 'Character FAQ', ja: 'キャラのよくある質問' })}</h2>
      {faqs.map(([question, answer], index) => <details className="character-reference__entry" key={index}><summary>{question}</summary><p>{answer}</p></details>)}
    </section>}
    {related.length > 0 && <section id="related-characters">
      <h2>{text(locale, { zh: '相关角色', en: 'Related Characters', ja: '関連キャラ' })}</h2>
      <ul className="character-reference__values">{related.map((id, index) => <li key={`${id}-${index}`}>{characterLink(id)}</li>)}</ul>
    </section>}
  </>;
}
