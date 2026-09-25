import Link from 'next/link';
import { characters, gameName, guides, kibo, kiboFacilities, kiboLifeSkills, weapons, worldRegions } from '@/lib/data';
import { asLocale, localize } from '@/lib/i18n';
import { metadata, url } from '@/lib/seo';
import { GameNav } from '@/components/game-nav';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const locale = asLocale((await params).lang);
  return metadata(locale, localize(locale, { zh: '蓝色星原：旅谣 Wiki｜角色、攻略与官方信息', en: 'Azur Promilia Wiki | Characters, Guides, and Official Information', ja: 'アズールプロミリア Wiki｜キャラクター、攻略、公式情報' }), localize(locale, { zh: '蓝色星原：旅谣的官方信息核对、角色、武器、攻略、强度参考与兑换码追踪。', en: 'Official-information checks, characters, weapons, guides, tier-list references, and code tracking for Azur Promilia.', ja: 'アズールプロミリアの公式情報確認、キャラクター、武器、攻略、Tier参考、コード情報をまとめます。' }));
}

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const locale = asLocale((await params).lang);
  const title = localize(locale, { zh: '蓝色星原：旅谣资料站', en: 'Azur Promilia Reference Hub', ja: 'アズールプロミリア資料ハブ' });
  const intro = localize(locale, { zh: '本站为独立资料站。角色、武器、版本和兑换信息仅在可由官方来源核对后收录。', en: 'This is an independent reference site. Character, weapon, version, and code information is published only after it can be checked against official sources.', ja: '本サイトは独立した資料サイトです。キャラクター、武器、バージョン、コード情報は、公式情報で確認できたもののみ掲載します。' });
  const pages = [
    ['characters', { zh: '角色图鉴', en: 'Characters', ja: 'キャラクター' }, characters.length],
    ['weapons', { zh: '武器资料', en: 'Weapons', ja: '武器' }, weapons.length],
    ['guides', { zh: '攻略与核对清单', en: 'Guides and checklists', ja: '攻略と確認リスト' }, guides.length],
    ['kibo', { zh: 'Kibo 图鉴', en: 'Kibo index', ja: 'キボ図鑑' }, kibo.length],
    ['systems', { zh: '系统词典', en: 'Systems glossary', ja: 'システム用語集' }, kiboFacilities.length + kiboLifeSkills.length],
    ['world', { zh: '世界与地区', en: 'World and regions', ja: '世界と地域' }, worldRegions.length],
    ['redeem-codes', { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, 0],
    ['planner', { zh: '养成规划器', en: 'Progression planner', ja: '育成プランナー' }, 1],
    ['version', { zh: '版本与上线', en: 'Version status', ja: 'バージョン情報' }, 3],
  ] as const;
  const structuredData = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, description: intro, url: url(locale), inLanguage: locale === 'zh' ? 'zh-CN' : locale };
  return <><GameNav locale={locale}/><main className="content"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /><div className="eyebrow">{gameName(locale)}</div><h1>{title}</h1><p className="lead">{intro}</p><p className="notice">{localize(locale, { zh: '当前已收录官方角色与 Kibo 资料，并整理了明确标注的 CBT 系统、探索、战斗、家园和养成参考。角色数值、掉落、概率、正式平台和上线日期仍以官方公告与游戏内版本为准。', en: 'The hub currently includes official character and Kibo material plus clearly labelled CBT references for systems, exploration, combat, homestead, and progression. Character values, drops, rates, release platforms, and launch dates still require official and in-game confirmation.', ja: '現在は公式キャラクター・キボ資料に加え、システム、探索、戦闘、拠点、育成のCBT参照を明確に区分して収録しています。キャラクター数値、ドロップ、確率、対応機種、配信日は公式告知とゲーム内版で確認してください。' })}</p><section className="grid">{pages.map(([page, label, count]) => <Link className="card" href={`/${locale}/azur-promilia/${page}`} key={page}><div className="card__title">{label[locale]}</div><div className="card__meta">{count > 0 ? `${count} ${locale === 'zh' ? '条已收录' : locale === 'ja' ? '件を収録' : 'entries recorded'}` : localize(locale, { zh: '等待官方资料确认', en: 'Awaiting verified information', ja: '公式情報を確認中' })}</div></Link>)}</section></main></>;
}
