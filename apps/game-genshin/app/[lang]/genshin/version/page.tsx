import Link from 'next/link';
import { GameNav } from '@/components/game-nav';
import { genshinGuides } from '@/lib/data';
import { asLocale, text } from '@/lib/i18n';
import { breadcrumbJsonLd, genshinMetadata } from '@/lib/seo';

const copy = {
  zh: {
    title: '原神 7.1 前瞻专题',
    lead: '围绕 7.1 前瞻、Luna II、Snezhnaya、Sandrone、直播码、当前与下期卡池整理版本入口。实时日期、奖励和卡池请以官方公告与游戏内状态为准。',
    highlights: ['7.1 前瞻与直播码', 'Snezhnaya / Sandrone 资讯', '当前与下期卡池', 'Nod-Krai 地图与材料'],
    overview: '这个专题把版本相关的公开信息按优先级整理：先确认直播码和当前卡池，再根据目标角色查看材料、武器、圣遗物和队伍资料。未经官方确认的机制、日期和奖励不会作为确定结论发布。',
    faq: [
      ['这个版本专题主要看什么？', '优先查看 7.1 前瞻、直播码、Snezhnaya / Sandrone、当前与下期卡池，以及 Nod-Krai 的地图和材料入口。'],
      ['Nod-Krai 内容还值得看吗？', '值得。地图、材料和奖励仍是长期检索入口；但先按当前版本的直播码和卡池安排资源会更有效。'],
      ['抽卡前应该先确认什么？', '先确认官方卡池时间和代码有效期，再查看目标角色的定位、所需材料、可用武器与队伍缺口。'],
    ],
  },
  en: {
    title: 'Genshin v7.1 Watch',
    lead: 'A hub for v7.1 watch, Luna II, Snezhnaya, Sandrone, livestream codes, and current and next banners. Confirm live dates, rewards, and banners in official notices and in-game.',
    highlights: ['v7.1 watch and livestream codes', 'Snezhnaya / Sandrone coverage', 'Current and next banners', 'Nod-Krai maps and materials'],
    overview: 'This hub organizes public version information by priority: verify livestream codes and the current banner first, then check materials, weapons, artifacts, and team references for a target character. Unconfirmed mechanics, dates, and rewards are not presented as settled facts.',
    faq: [
      ['What is this version hub for?', 'Start with the v7.1 watch, livestream codes, Snezhnaya / Sandrone, current and next banners, then continue into Nod-Krai maps and materials.'],
      ['Is Nod-Krai content still useful?', 'Yes. Maps, materials, and rewards remain durable search routes, but current codes and banners should guide immediate planning.'],
      ['What should I check before pulling?', 'Confirm official banner timing and code validity first, then review the target character, materials, available weapons, and roster gaps.'],
    ],
  },
  ja: {
    title: '原神 v7.1 注目',
    lead: 'v7.1、Luna II、Snezhnaya、Sandrone、配信コード、現在と次回バナーを整理します。日程、報酬、バナーは公式告知とゲーム内で確認してください。',
    highlights: ['v7.1注目と配信コード', 'Snezhnaya / Sandrone 情報', '現在と次回バナー', 'Nod-Krai マップと素材'],
    overview: 'この特集では公開済みのバージョン情報を優先度順に整理します。まず配信コードと現在バナーを確認し、目標キャラの素材、武器、聖遺物、編成資料へ進んでください。未確認の性能、日程、報酬は確定情報として扱いません。',
    faq: [
      ['このバージョン特集では何を見ればいいですか？', 'v7.1注目、配信コード、Snezhnaya / Sandrone、現在と次回バナーを先に確認し、その後 Nod-Krai のマップと素材へ進みます。'],
      ['Nod-Krai の内容はまだ役立ちますか？', 'はい。マップ、素材、報酬は長期的な検索導線として役立ちますが、直近の計画ではコードとバナーを優先してください。'],
      ['ガチャ前に何を確認すべきですか？', '公式バナーの日程とコード期限を先に確認し、目標キャラ、素材、使える武器、手持ちの不足を見直してください。'],
    ],
  },
} as const;
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) { const locale = asLocale((await params).lang); return genshinMetadata(locale, 'version', copy[locale].title, copy[locale].lead); }
export default async function Version({ params }: { params: Promise<{ lang: string }> }) { const locale = asLocale((await params).lang); const value = copy[locale]; const featured = genshinGuides.filter((guide) => ['banner-schedule-guide', 'snezhnaya-version-guide', 'nod-krai-cryoculus-phase-ii-checklist'].includes(guide.id)); const additionalGuides = genshinGuides.filter((guide) => !featured.includes(guide)).slice(0, 8); const faqSchema = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: value.faq.map(([question, answer]) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })) }; return <><GameNav locale={locale} current="version"/><main className="content"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(locale, 'version', value.title)) }}/><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}/><h1>{value.title}</h1><p className="lead">{value.lead}</p><section><h2>{text(locale, { zh: '版本重点', en: 'Version focus', ja: 'バージョンの重点' })}</h2><p>{value.overview}</p><div className="grid">{value.highlights.map((highlight) => <article className="card" key={highlight}><div className="card-title">{highlight}</div></article>)}</div></section><section><h2>{text(locale, { zh: '优先入口', en: 'Priority entry points', ja: '優先導線' })}</h2><div className="grid"><Link className="card" href={`/${locale}/genshin/redeem-codes`}><div className="card-title">{text(locale, { zh: '兑换码', en: 'Redeem codes', ja: '交換コード' })}</div></Link><Link className="card" href={`/${locale}/genshin/guides/banner-schedule-guide`}><div className="card-title">{text(locale, { zh: '当前/下期卡池', en: 'Current/next banners', ja: '現在/次回バナー' })}</div></Link><Link className="card" href={`/${locale}/genshin/map`}><div className="card-title">{text(locale, { zh: 'Nod-Krai 地图', en: 'Nod-Krai map', ja: 'Nod-Kraiマップ' })}</div></Link><Link className="card" href={`/${locale}/genshin/characters`}><div className="card-title">{text(locale, { zh: '角色图鉴', en: 'Characters', ja: 'キャラクター' })}</div></Link><Link className="card" href={`/${locale}/genshin/weapons`}><div className="card-title">{text(locale, { zh: '武器图鉴', en: 'Weapons', ja: '武器' })}</div></Link><Link className="card" href={`/${locale}/genshin/items`}><div className="card-title">{text(locale, { zh: '材料图鉴', en: 'Materials', ja: '素材' })}</div></Link><Link className="card" href={`/${locale}/genshin/artifacts`}><div className="card-title">{text(locale, { zh: '圣遗物图鉴', en: 'Artifacts', ja: '聖遺物' })}</div></Link><Link className="card" href={`/${locale}/genshin/build`}><div className="card-title">{text(locale, { zh: '配装推荐', en: 'Build references', ja: 'ビルド資料' })}</div></Link><Link className="card" href={`/${locale}/genshin/teams`}><div className="card-title">{text(locale, { zh: '配队参考', en: 'Team references', ja: '編成資料' })}</div></Link></div></section><section><h2>{text(locale, { zh: '版本攻略', en: 'Version guides', ja: 'バージョン攻略' })}</h2><div className="grid">{featured.map((guide) => <Link className="card" key={guide.id} href={`/${locale}/genshin/guides/${guide.id}`}><div className="card-title">{locale === 'zh' ? guide.title : locale === 'ja' ? guide.titleJa ?? guide.titleEn : guide.titleEn}</div></Link>)}</div></section><section><h2>{text(locale, { zh: '延伸阅读', en: 'Further reading', ja: '関連攻略' })}</h2><div className="grid">{additionalGuides.map((guide) => <Link className="card" key={guide.id} href={`/${locale}/genshin/guides/${guide.id}`}>{locale === 'zh' ? guide.title : locale === 'ja' ? guide.titleJa ?? guide.titleEn : guide.titleEn}</Link>)}</div></section><section><h2>FAQ</h2>{value.faq.map(([question, answer]) => <article className="card" key={question}><h3>{question}</h3><p>{answer}</p></article>)}</section></main></>; }
