import Link from 'next/link';
import { GameNav } from '@/components/game-nav';
import { ReferenceNotes } from '@/components/reference-notes';
import { BuildRecommender } from '@/components/build-recommender';
import { artifactSets, genshinCharacters, genshinWeapons, getGenshinCharacterImage } from '@/lib/data';
import { asLocale, text } from '@/lib/i18n';
import { genshinMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) { const locale = asLocale((await params).lang); const title = text(locale, { zh: '原神角色配装推荐', en: 'Genshin Impact Builds', ja: '原神キャラビルド' }); return genshinMetadata(locale, 'build', title, text(locale, { zh: '原神角色武器、圣遗物与培养方向参考。', en: 'Genshin Impact weapon, artifact, and character build references.', ja: '原神の武器、聖遺物、キャラクタービルド参考。' })); }
export default async function Build({ params }: { params: Promise<{ lang: string }> }) {
  const locale = asLocale((await params).lang);
  const title = text(locale, { zh: '原神角色配装推荐', en: 'Genshin Impact Builds', ja: '原神キャラビルド' });
  const characters = genshinCharacters.map(character => {
    const { id, name, nameEn, nameJa, element, rarity, weaponType, recommendedBuild, teamComps } = character;
    return { id, name, nameEn, nameJa, element, rarity, weaponType, recommendedBuild, teamComps, image: getGenshinCharacterImage(character) };
  });
  const notes = locale === 'zh' ? ['先给每个角色写下在当前队伍中的职责，再选择能支持这项职责的武器、圣遗物与词条方向。比较时保持同一队伍循环和资源预算，避免把不同场景中的数值直接放在一起。', '优先检查已经拥有的武器和套装，再考虑需要新获取或长期刷取的候选。一个可稳定使用、成本可控的方案通常比依赖不确定资源的理论最优解更适合近期推进。', '完成配装草案后，回到材料页确认实际升级成本，并到配队和版本页复核是否仍与当前目标一致。武器效果、套装条件、活动和卡池的实时状态应以游戏内说明和官方公告为准。'] : locale === 'ja' ? ['まず各キャラが現在の編成で担う役割を書き出し、その役割を支える武器、聖遺物、ステータスの方向を選びます。比較では同じ編成ローテーションと資源予算を保ち、異なる場面の数値を直接混ぜないでください。', '新たに入手する、または長く周回する候補を考える前に、すでに所持している武器とセットを確認します。安定して使えてコストを管理できる構成は、不確定な資源に依存する理論上の最適解より、直近の進行に向く場合が多いです。', 'ビルド案を作った後は、素材ページで実際の育成コストを確認し、編成とバージョンページで現在の目標と一致しているかを再確認します。武器効果、セット条件、イベント、バナーの最新状態はゲーム内説明と公式告知を基準にしてください。'] : ['Write down the role each character fills in the current team, then choose weapons, artifacts, and stat directions that support that role. Keep the same team rotation and resource budget while comparing so values from unrelated situations are not mixed together.', 'Check owned weapons and sets before considering candidates that require a new acquisition or long farming period. A stable, affordable setup is often better for near-term progress than a theoretical best option dependent on uncertain resources.', 'After drafting a build, return to the material page for the actual upgrade cost and use team and version pages to confirm it still matches the current goal. Live weapon effects, set conditions, events, and banner status should be verified in-game and through official notices.'];
  return <><GameNav locale={locale} current="build"/><main id="main-content" tabIndex={-1} className="content build-page">
    <h1>{title}</h1><p className="lead">{text(locale, { zh: '按角色查看现有武器与圣遗物资料；最终选择应结合队伍、版本和库存。', en: 'Browse existing weapon and artifact references by character; final choices depend on team, patch, and inventory.', ja: 'キャラごとの武器と聖遺物資料を確認できます。最終判断は編成、バージョン、所持状況と合わせて行ってください。' })}</p>
    <BuildRecommender catalog={{ characters, weapons: genshinWeapons, artifacts: artifactSets }} locale={locale} />
    <section><h2>{text(locale, { zh: '配装核对顺序', en: 'Build-check order', ja: 'ビルド確認の順番' })}</h2><p>{text(locale, { zh: '先确定角色在队伍中的职责，再比较可装备武器、套装效果与现有词条。这里的入口帮助你浏览资料，不会将单一武器或圣遗物声明为跨版本的固定最优解。', en: 'Define a character’s job in the team first, then compare equippable weapons, set effects, and existing sub-stats. These entries help you browse references and do not declare one weapon or set permanently best across versions.', ja: 'まず編成内での役割を決め、装備できる武器、セット効果、手持ちの追加ステータスを比較します。このページは資料閲覧用であり、一つの武器やセットを全バージョンで固定の最適解とはしません。' })}</p>{notes.map(note => <p key={note}>{note}</p>)}</section>
    <section><h2>{text(locale, { zh: '配装后继续核对', en: 'Verify after planning', ja: '計画後に確認する資料' })}</h2><div className="grid"><Link className="card" href={`/${locale}/genshin/weapons`}>{text(locale, { zh: '武器图鉴', en: 'Weapons', ja: '武器図鑑' })}</Link><Link className="card" href={`/${locale}/genshin/artifacts`}>{text(locale, { zh: '圣遗物图鉴', en: 'Artifacts', ja: '聖遺物図鑑' })}</Link><Link className="card" href={`/${locale}/genshin/teams`}>{text(locale, { zh: '配队参考', en: 'Teams', ja: '編成資料' })}</Link><Link className="card" href={`/${locale}/genshin/items`}>{text(locale, { zh: '材料图鉴', en: 'Materials', ja: '素材図鑑' })}</Link></div></section>
    <section><h2>{text(locale, { zh: '实时核对与安全边界', en: 'Live checks and safety', ja: '最新確認と安全な手順' })}</h2><ReferenceNotes locale={locale} topic="execution-plan" /><ReferenceNotes locale={locale} topic="live-checks" /></section>
  </main></>;
}
