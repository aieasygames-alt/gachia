import Link from 'next/link';
import { GameNav } from '@/components/game-nav';
import { genshinCharacters, getGenshinCharacterImage } from '@/lib/data';
import { TierListExplorer } from '@/components/tier-list';
import { projectTierCharacters } from '@/lib/tier-list';
import { asLocale, text } from '@/lib/i18n';
import { genshinMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) { const locale = asLocale((await params).lang); const title = text(locale, { zh: '原神角色强度参考', en: 'Genshin Impact Tier Reference', ja: '原神キャラTier参考' }); return genshinMetadata(locale, 'tier-list', title, text(locale, { zh: '按现有资料整理的原神角色强度参考，培养或抽取前请核对当前版本和队伍条件。', en: 'A Genshin Impact tier reference based on available data; verify current patch and team conditions before investing.', ja: '既存データに基づく原神キャラTier参考です。育成・ガチャ前に現行バージョンと編成条件を確認してください。' })); }
export default async function TierList({ params }: { params: Promise<{ lang: string }> }) {
  const locale = asLocale((await params).lang);
  const title = text(locale, { zh: '原神角色强度参考', en: 'Genshin Impact Tier Reference', ja: '原神キャラTier参考' });
  return <><GameNav locale={locale} current="tier-list"/><main id="main-content" tabIndex={-1} className="content tier-page"><h1>{title}</h1>
    <p className="notice">{text(locale, { zh: '强度受版本、队伍、武器、圣遗物和玩法环境影响，不应单独作为抽卡结论。', en: 'Tier context depends on patch, teams, weapons, artifacts, and content; do not use it as the only pull decision.', ja: 'Tierはバージョン、編成、武器、聖遺物、コンテンツで変わるため、単独でガチャ判断に使わないでください。' })}</p>
    <p className="meta">{text(locale, { zh: '既有评级页标注的资料日期为 2026-06-28，不代表当前版本的实时评级；抽取或培养前请核对版本和队伍条件。', en: 'The legacy rating page labels its reference date as 2026-06-28, not a live current-patch rating. Verify patch and team conditions before investing.', ja: '従来の評価ページに記載された資料日は2026-06-28です。現行バージョンのリアルタイム評価ではないため、育成前にバージョンと編成条件を確認してください。' })}</p>
    <TierListExplorer characters={projectTierCharacters(genshinCharacters, getGenshinCharacterImage)} locale={locale} />
    <nav className="compare-next" aria-label={text(locale, { zh: '继续核对', en: 'Continue checking', ja: '続けて確認する' })}><Link href={`/${locale}/genshin/teams`}>{text(locale, { zh: '配队参考', en: 'Team references', ja: '編成参考' })}</Link><Link href={`/${locale}/genshin/build`}>{text(locale, { zh: '配装推荐', en: 'Build references', ja: 'ビルド資料' })}</Link><Link href={`/${locale}/genshin/version`}>{text(locale, { zh: '版本专题', en: 'Version watch', ja: 'バージョン特集' })}</Link></nav>
  </main></>;
}
