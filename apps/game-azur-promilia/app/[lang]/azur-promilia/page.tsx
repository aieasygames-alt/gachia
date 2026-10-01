import Link from 'next/link';
import { characters, gameName, guides, kibo, kiboFacilities, kiboLifeSkills, travelTraceVerification, weapons, worldRegions } from '@/lib/data';
import { asLocale, localize } from '@/lib/i18n';
import { metadata, url } from '@/lib/seo';
import { GameNav } from '@/components/game-nav';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const locale = asLocale((await params).lang);
  return metadata(locale, localize(locale, { zh: '蓝色星原：旅谣旅迹测试 Wiki｜奇波、家园与攻略', en: 'Azur Promilia Travel Trace Wiki | Kibo, Homestead, and Guides', ja: 'アズールプロミリア旅跡テスト Wiki｜キボ、拠点、攻略' }), localize(locale, { zh: '追踪蓝色星原：旅谣旅迹测试的官方信息、奇波、家园、角色、武器与攻略；测试资料与正式服结论分开标注。', en: 'Track official Travel Trace Test information for Azur Promilia: Kibo, Homestead, characters, weapons, and guides, with CBT material separated from release conclusions.', ja: 'アズールプロミリア旅跡テストの公式情報、キボ、拠点、キャラクター、武器、攻略を追跡し、CBT資料と正式版の結論を分けます。' }));
}

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const locale = asLocale((await params).lang);
  const title = localize(locale, { zh: '蓝色星原：旅谣资料站', en: 'Azur Promilia Reference Hub', ja: 'アズールプロミリア資料ハブ' });
  const intro = localize(locale, { zh: '本站为独立资料站。当前优先追踪「旅迹测试」的奇波、家园、战斗、探索、养成与界面更新；角色、武器、版本和兑换信息仅在可由官方来源核对后收录。', en: 'This is an independent reference site. It currently prioritizes Travel Trace Test changes to Kibo, Homestead, combat, exploration, progression, and UI; character, weapon, version, and code information is published only after official verification.', ja: '本サイトは独立した資料サイトです。現在は「旅跡テスト」のキボ、拠点、戦闘、探索、育成、UI更新を優先し、キャラクター、武器、バージョン、コード情報は公式確認後のみ掲載します。' });
  const pages = [
    ['characters', { zh: '角色图鉴', en: 'Characters', ja: 'キャラクター' }, characters.length],
    ['weapons', { zh: '武器资料', en: 'Weapons', ja: '武器' }, weapons.length],
    ['guides', { zh: '攻略与核对清单', en: 'Guides and checklists', ja: '攻略と確認リスト' }, guides.length],
    ['travel-trace', { zh: '旅迹测试核验台', en: 'Travel Trace checks', ja: '旅跡テスト確認台' }, travelTraceVerification.length],
    ['kibo', { zh: 'Kibo 图鉴', en: 'Kibo index', ja: 'キボ図鑑' }, kibo.length],
    ['systems', { zh: '系统词典', en: 'Systems glossary', ja: 'システム用語集' }, kiboFacilities.length + kiboLifeSkills.length],
    ['world', { zh: '世界与地区', en: 'World and regions', ja: '世界と地域' }, worldRegions.length],
    ['redeem-codes', { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' }, 0],
    ['planner', { zh: '养成规划器', en: 'Progression planner', ja: '育成プランナー' }, 1],
    ['version', { zh: '版本与上线', en: 'Version status', ja: 'バージョン情報' }, 3],
  ] as const;
  const structuredData = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, description: intro, url: url(locale), inLanguage: locale === 'zh' ? 'zh-CN' : locale };
  const travelTraceGuideIds = new Set(['kibo-battle-and-ecology', 'homestead-progression', 'banner-system-status', 'test-feedback-tracker']);
  const travelTraceGuides = guides.filter((guide) => travelTraceGuideIds.has(guide.id));
  return <><GameNav locale={locale}/><main id="main-content" tabIndex={-1} className="content"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /><div className="eyebrow">{gameName(locale)}</div><h1>{title}</h1><p className="lead">{intro}</p><p className="notice">{localize(locale, { zh: '当前已收录官方角色与 Kibo 资料，并整理了明确标注的 CBT 系统、探索、战斗、家园和养成参考。角色数值、掉落、概率、正式平台和上线日期仍以官方公告与游戏内版本为准。', en: 'The hub currently includes official character and Kibo material plus clearly labelled CBT references for systems, exploration, combat, homestead, and progression. Character values, drops, rates, release platforms, and launch dates still require official and in-game confirmation.', ja: '現在は公式キャラクター・キボ資料に加え、システム、探索、戦闘、拠点、育成のCBT参照を明確に区分して収録しています。キャラクター数値、ドロップ、確率、対応機種、配信日は公式告知とゲーム内版で確認してください。' })}</p><section><h2>{localize(locale, { zh: '旅迹测试专题', en: 'Travel Trace Test', ja: '旅跡テスト特集' })}</h2><p className="lead">{localize(locale, { zh: '专题内容以当前测试和官方公告为依据；家园、奇波、抽卡与反馈结论均保留版本和来源边界。', en: 'Topic pages use the current test and official notices; Homestead, Kibo, banner, and feedback conclusions retain version and source boundaries.', ja: '特集ページは現行テストと公式告知を基準にし、拠点、キボ、バナー、フィードバックの結論には版と出典の境界を残します。' })}</p><div className="grid">{travelTraceGuides.map((guide) => <Link className="card" href={`/${locale}/azur-promilia/guides/${guide.id}`} key={guide.id}><div className="card__title">{guide.title[locale]}</div><p>{guide.summary[locale]}</p></Link>)}</div></section><section className="grid">{pages.map(([page, label, count]) => <Link className="card" href={`/${locale}/azur-promilia/${page}`} key={page}><div className="card__title">{label[locale]}</div><div className="card__meta">{count > 0 ? `${count} ${locale === 'zh' ? '条已收录' : locale === 'ja' ? '件を収録' : 'entries recorded'}` : localize(locale, { zh: '等待官方资料确认', en: 'Awaiting verified information', ja: '公式情報を確認中' })}</div></Link>)}</section></main></>;
}
