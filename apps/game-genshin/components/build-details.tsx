import Link from 'next/link';
import type { SupportedLocale } from '@gachia/core';
import { buildCharacterName, genericBuildWeapons, hasBuildRecommendation, resolveBuildEquipment, type BuildCatalog, type BuildCharacter } from '../lib/build-catalog';
import { text } from '../lib/i18n';

export function BuildDetails({ catalog, character, locale }: { catalog: BuildCatalog; character: BuildCharacter; locale: SupportedLocale }) {
  const build = character.recommendedBuild;
  const local = (zh?: string, en?: string) => locale === 'zh' ? zh || en || '' : en || zh || '';
  const weapon = resolveBuildEquipment(catalog.weapons, build?.bestWeaponEn || build?.bestWeapon || '');
  const generic = build?.bestWeaponEn?.toLowerCase().includes('generic');
  const weapons = weapon ? [weapon] : generic ? genericBuildWeapons(catalog.weapons, character.weaponType) : [];
  const mainStats = (locale === 'zh' ? build?.mainStats : build?.mainStatsEn) ?? {};
  const priorities = (locale === 'zh' ? build?.subStatPriority : build?.subStatPriorityEn) ?? [];
  const sets = [
    { label: text(locale, { zh: '圣遗物套装', en: 'Artifact Set', ja: '聖遺物セット' }), name: local(build?.bestArtifactSet, build?.bestArtifactSetEn), lookup: build?.bestArtifactSetEn || build?.bestArtifactSet },
    { label: text(locale, { zh: '备选套装', en: 'Alternative Set', ja: '代替セット' }), name: local(build?.alternativeArtifactSet, build?.alternativeArtifactSetEn), lookup: build?.alternativeArtifactSetEn || build?.alternativeArtifactSet },
  ].filter(set => set.name);
  const slots: Record<string, string> = {
    Sands: text(locale, { zh: '时之沙', en: 'Sands', ja: '時の砂' }), Goblet: text(locale, { zh: '空之杯', en: 'Goblet', ja: '空の杯' }),
    Circlet: text(locale, { zh: '理之冠', en: 'Circlet', ja: '理の冠' }),
  };
  return <div className="build-tool__details" data-build-character={character.id}>
    {!hasBuildRecommendation(character) && <p role="status">{text(locale, { zh: '暂无配装推荐资料。', en: 'No build recommendation available.', ja: 'ビルドの推奨資料はまだありません。' })}</p>}
    {(weapons.length > 0 || build?.bestWeapon || build?.bestWeaponEn) && <section>
      <h3>{generic ? text(locale, { zh: '武器候选', en: 'Weapon Candidates', ja: '武器候補' }) : text(locale, { zh: '最佳武器', en: 'Best Weapon', ja: '推奨武器' })}</h3>
      {weapons.length ? <ul className="build-tool__equipment">{weapons.map(item => <li key={item.id}>
        <Link href={`/${locale}/genshin/weapons/${item.id}`}>{local(item.name, item.nameEn)}</Link><span className="meta">{item.rarity}★</span>
        <dl><div><dt>{text(locale, { zh: '基础攻击', en: 'Base ATK', ja: '基礎攻撃' })}</dt><dd>{item.baseAtk}</dd></div>{item.subStat && <div><dt>{item.subStat}</dt><dd>{item.subStatValue}</dd></div>}</dl>
        {!generic && <><strong>{local(item.effectName, item.effectNameEn)}</strong><p>{local(item.effectDescription, item.effectDescriptionEn)}</p></>}
      </li>)}</ul> : <p>{local(build?.bestWeapon, build?.bestWeaponEn)}</p>}
    </section>}
    {Boolean(build?.alternativeWeapons?.length) && <section><h3>{text(locale, { zh: '备选武器', en: 'Alternative Weapons', ja: '代替武器' })}</h3>
      <ul className="character-reference__values">{build!.alternativeWeapons.map((name, index) => {
        const item = resolveBuildEquipment(catalog.weapons, name);
        return <li key={index}>{item ? <Link href={`/${locale}/genshin/weapons/${item.id}`}>{name}</Link> : name}</li>;
      })}</ul>
    </section>}
    {sets.map(set => {
      const item = resolveBuildEquipment(catalog.artifacts, set.lookup || '');
      return <section key={set.label}><h3>{set.label}</h3>{item ? <>
        <Link href={`/${locale}/genshin/artifacts/${item.id}`}>{local(item.name, item.nameEn)}</Link>
        <p><strong>2pc: </strong>{local(item.bonus2pc, item.bonus2pcEn)}</p><p><strong>4pc: </strong>{local(item.bonus4pc, item.bonus4pcEn)}</p>
      </> : <p>{set.name}</p>}</section>;
    })}
    {Object.keys(mainStats).length > 0 && <section><h3>{text(locale, { zh: '主属性', en: 'Main Stats', ja: 'メインステータス' })}</h3>
      <dl className="build-tool__stats">{Object.entries(mainStats).map(([slot, value]) => <div key={slot}><dt>{slots[slot] ?? slot}</dt><dd>{value}</dd></div>)}</dl>
    </section>}
    {priorities.length > 0 && <section><h3>{text(locale, { zh: '副属性优先级', en: 'Substat Priority', ja: 'サブステータス優先度' })}</h3>
      <ol className="build-tool__priorities">{priorities.map((value, index) => <li key={index}>{value}</li>)}</ol>
    </section>}
    {Boolean(character.teamComps?.length) && <section><h3>{text(locale, { zh: '推荐配队', en: 'Team Compositions', ja: 'おすすめパーティ' })}</h3>
      {character.teamComps!.map((team, index) => <article className="build-tool__team" key={index}><h4>{local(team.name, team.nameEn)}</h4><p>{local(team.description, team.descriptionEn)}</p>
        <ul className="character-reference__values">{team.members.map((id, memberIndex) => {
          const member = catalog.characters.find(row => row.id === id || row.name === id || row.nameEn === id || row.nameJa === id);
          return <li key={memberIndex}>{member ? <Link href={`/${locale}/genshin/characters/${member.id}`}>{buildCharacterName(member, locale)}</Link> : id}</li>;
        })}</ul>
      </article>)}
    </section>}
  </div>;
}
