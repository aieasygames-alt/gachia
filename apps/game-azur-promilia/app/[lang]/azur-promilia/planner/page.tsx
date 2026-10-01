import { characters } from '@/lib/data';
import { asLocale, localize } from '@/lib/i18n';
import { metadata, url } from '@/lib/seo';
import { GameNav } from '@/components/game-nav';
import { ProgressionPlanner } from '@/components/progression-planner';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) { const locale = asLocale((await params).lang); return metadata(locale, localize(locale, { zh: '蓝色星原：旅谣养成规划器', en: 'Azur Promilia Progression Planner', ja: 'アズールプロミリア 育成プランナー' }), localize(locale, { zh: '规划角色等级目标，并在正式材料数据核验后计算缺口。', en: 'Plan character level targets before verified material shortage calculations are available.', ja: '公式素材データの確認前にキャラクター育成目標を計画します。' }), 'planner'); }
export default async function Planner({ params }: { params: Promise<{ lang: string }> }) { const locale = asLocale((await params).lang); const title = localize(locale, { zh: '养成规划器', en: 'Progression Planner', ja: '育成プランナー' }); return <><GameNav locale={locale} current="planner"/><main id="main-content" tabIndex={-1} className="content"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebApplication', name: title, url: url(locale, 'planner') }) }} /><h1>{title}</h1><p className="lead">{localize(locale, { zh: '先规划目标，再等待官方材料表完成核验。', en: 'Set a target first, then add exact materials after official verification.', ja: 'まず目標を設定し、公式確認後に正確な素材を追加します。' })}</p><ProgressionPlanner characters={characters} locale={locale}/></main></>; }
