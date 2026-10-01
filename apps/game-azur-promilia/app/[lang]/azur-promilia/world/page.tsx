import { worldRegions } from '@/lib/data';
import { asLocale, localize } from '@/lib/i18n';
import { metadata, url } from '@/lib/seo';
import { GameNav } from '@/components/game-nav';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const locale = asLocale((await params).lang);
  return metadata(locale, localize(locale, { zh: '蓝色星原：旅谣世界与地区', en: 'Azur Promilia World and Regions', ja: 'アズールプロミリア 世界と地域' }), localize(locale, { zh: '根据官方世界页面整理蓝色星原：旅谣的地区资料。', en: 'World and region references based on the official Azur Promilia world pages.', ja: '公式世界ページに基づくアズールプロミリアの地域資料。' }), 'world');
}

export default async function WorldPage({ params }: { params: Promise<{ lang: string }> }) {
  const locale = asLocale((await params).lang);
  const title = localize(locale, { zh: '世界与地区', en: 'World and Regions', ja: '世界と地域' });
  return <><GameNav locale={locale} current="world" /><main id="main-content" tabIndex={-1} className="content"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, url: url(locale, 'world') }) }} /><h1>{title}</h1><p className="card__meta">{localize(locale, { zh: '来源：日本官方世界页（核验：2026-09-25）', en: 'Source: Japanese official world page (checked 2026-09-25)', ja: '出典：日本公式ワールドページ（2026-09-25確認）' })}</p><p className="lead">{localize(locale, { zh: '未知文明、魔法、幻想生物与星辰传说构成了旅途的舞台。地区介绍以官方页面为准。', en: 'Unknown civilizations, magic, fantasy creatures, and star-born legends shape the journey. Region descriptions follow official pages.', ja: '未知の文明、魔法、幻想生物、星々の伝説が旅の舞台を形作ります。地域紹介は公式ページを基準にしています。' })}</p><p className="notice">{localize(locale, { zh: '本页记录地区名称、角色关联、地标与官方世界观介绍；地图范围、传送点、采集物、任务和开放条件属于版本资料，尚未用旧测试信息替代。', en: 'This page records region names, character associations, landmarks, and official world lore. Map boundaries, waypoints, resources, quests, and access conditions are version data and are not filled with old test information.', ja: 'このページは地域名、キャラクターとの関係、地標、公式世界観を記録します。マップ範囲、ワープポイント、資源、任務、解放条件はバージョン依存のため、旧テスト情報で補完していません。' })}</p><section className="grid">{worldRegions.map((region) => <article className="card" key={region.id}><div className="card__title">{region.name[locale]}</div><div className="card__badge">{region.status === 'official' ? localize(locale, { zh: '官方已介绍', en: 'Officially introduced', ja: '公式紹介済み' }) : localize(locale, { zh: '区域观察中', en: 'Region under watch', ja: '地域観測中' })}</div><p>{region.description[locale]}</p><p className="card__meta"><strong>{localize(locale, { zh: '地标：', en: 'Landmarks: ', ja: '地標：' })}</strong>{region.landmarks[locale].join(' · ')}</p><p className="card__meta"><strong>{localize(locale, { zh: '关联：', en: 'Connections: ', ja: '関連：' })}</strong>{region.associations[locale].join(' · ')}</p></article>)}</section></main></>;
}
