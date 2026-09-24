import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GameNav } from '@/components/game-nav';
import { genshinWeapons, getGenshinWeaponById, getGenshinWeaponEffect, getGenshinWeaponName, getGenshinWeaponSource } from '@/lib/data';
import { asLocale, text } from '@/lib/i18n';
import { entityJsonLd, genshinMetadata } from '@/lib/seo';

export function generateStaticParams() { return ['zh', 'en', 'ja'].flatMap((lang) => genshinWeapons.map((weapon) => ({ lang, id: weapon.id }))); }
export async function generateMetadata({ params }: { params: Promise<{ lang: string; id: string }> }) { const { lang, id } = await params; const locale = asLocale(lang); const weapon = getGenshinWeaponById(id); return weapon ? genshinMetadata(locale, `weapons/${id}`, `${getGenshinWeaponName(weapon, locale)} - Genshin Impact`, getGenshinWeaponEffect(weapon, locale).description) : {}; }
export default async function WeaponDetail({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  const locale = asLocale(lang);
  const weapon = getGenshinWeaponById(id);
  if (!weapon) notFound();
  const name = getGenshinWeaponName(weapon, locale);
  const effect = getGenshinWeaponEffect(weapon, locale);
  const schemas = entityJsonLd(locale, `weapons/${id}`, name, effect.description, 'weapons');
  const detailBreadcrumb = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: locale === 'zh' ? '首页' : locale === 'ja' ? 'ホーム' : 'Home', item: `https://gachia.com/${locale}` }, { '@type': 'ListItem', position: 2, name: locale === 'en' ? 'Genshin Impact' : '原神', item: `https://gachia.com/${locale}/genshin` }, { '@type': 'ListItem', position: 3, name: locale === 'zh' ? '武器' : locale === 'ja' ? '武器' : 'Weapons', item: `https://gachia.com/${locale}/genshin/weapons` }, { '@type': 'ListItem', position: 4, name }] };
  const guidance = locale === 'zh'
    ? ['先确认武器类型是否与目标角色一致。', '将基础攻击、稀有度、副属性和效果放在同一套配装里比较。', '获取方式可能随活动、卡池或版本变化，应在游戏内或官方公告中复核。', '没有角色、圣遗物和队伍上下文时，不应仅凭单一属性判断优先级。']
    : locale === 'ja'
      ? ['まず武器種が育成したいキャラと一致するかを確認します。', '基礎攻撃力、レアリティ、追加ステータス、効果を同じビルド条件で比較します。', '入手方法はイベント、バナー、バージョンで変わる場合があるため、ゲーム内または公式告知で再確認します。', 'キャラ、聖遺物、編成の前提なしに、一つの数値だけで優先順位を決めないでください。']
      : ['Confirm that the weapon type matches the character you plan to build.', 'Compare base ATK, rarity, sub-stat, and effect under the same build conditions.', 'Sources can change with events, banners, or versions, so verify them in-game or in official notices.', 'Do not assign an upgrade priority from one stat without character, artifact, and team context.'];
  return <><GameNav locale={locale} current="weapons"/><main className="content article"><Link className="back" href={`/${locale}/genshin/weapons`}>{text(locale, { zh: '返回武器图鉴', en: 'Back to weapons', ja: '武器一覧に戻る' })}</Link><h1>{name}</h1><div className="facts"><div><span>{text(locale, { zh: '类型', en: 'Type', ja: '種類' })}</span><strong>{weapon.weaponType}</strong></div><div><span>{text(locale, { zh: '稀有度', en: 'Rarity', ja: 'レアリティ' })}</span><strong>{weapon.rarity}★</strong></div><div><span>{text(locale, { zh: '基础攻击', en: 'Base ATK', ja: '基礎攻撃力' })}</span><strong>{weapon.baseAtk}</strong></div><div><span>{text(locale, { zh: '副属性', en: 'Sub-stat', ja: '追加ステータス' })}</span><strong>{weapon.subStat} {weapon.subStatValue}</strong></div></div><h2>{effect.name}</h2><p className="lead">{effect.description}</p><p><strong>{text(locale, { zh: '获取方式', en: 'Source', ja: '入手方法' })}:</strong> {getGenshinWeaponSource(weapon, locale)}</p><section><h2>{text(locale, { zh: '使用前核对', en: 'Before investing', ja: '育成前の確認' })}</h2>{guidance.map((item) => <p className="notice" key={item}>{item}</p>)}</section><section><h2>{text(locale, { zh: '继续比较配装', en: 'Continue comparing builds', ja: 'ビルド比較を続ける' })}</h2><p>{text(locale, { zh: '可先回到同类型武器图鉴，再结合角色、圣遗物和配队资料检查这把武器的实际位置。', en: 'Return to the same weapon-type index, then compare character, artifact, and team references to assess this weapon in context.', ja: '同じ武器種の図鑑に戻り、キャラ、聖遺物、編成資料と照合してこの武器の位置を判断できます。' })}</p><div className="grid"><Link className="card" href={`/${locale}/genshin/weapons`}>{text(locale, { zh: '武器图鉴', en: 'Weapons', ja: '武器図鑑' })}</Link><Link className="card" href={`/${locale}/genshin/characters`}>{text(locale, { zh: '角色图鉴', en: 'Characters', ja: 'キャラクター図鑑' })}</Link><Link className="card" href={`/${locale}/genshin/artifacts`}>{text(locale, { zh: '圣遗物图鉴', en: 'Artifacts', ja: '聖遺物図鑑' })}</Link><Link className="card" href={`/${locale}/genshin/build`}>{text(locale, { zh: '配装推荐', en: 'Build references', ja: 'ビルド資料' })}</Link></div></section>{schemas.map((schema, index) => <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />)}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(detailBreadcrumb) }} /></main></>;
}
