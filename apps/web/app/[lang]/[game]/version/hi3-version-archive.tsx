import { GAMES } from '@gachia/core';
import type { SupportedLocale } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';
import {
  getHi3AstralOpDescription,
  getHi3AstralOpName,
  getHi3StigmaSetDescription,
  getHi3StigmaSetName,
  hi3AstralOps,
  hi3StigmaSets,
} from '@gachia/data/games/hi3';
import { getHi3MaterialName, hi3Materials } from '@gachia/data/games/hi3/items';
import { getHi3WeaponName, hi3Weapons } from '@gachia/data/games/hi3/weapons';
import { Hi3ClientChecklist } from './hi3-client-checklist';

const COPY = {
  zh: {
    eyebrow: '版本档案', title: '崩坏3 9.0「曙梦向明」已公开档案',
    intro: '汇总本站已收录、且可由 9.0 官方公告直接核验的人偶与圣痕条目。当前补给、活动、资格和完整数值始终以客户端及最新官方公告为准。',
    astralOps: '协同人偶', stigmas: '圣痕套装', weapons: '装备档案', materials: '锻造与活动资源', route: '进入 9.0 资料的顺序', version: '收录版本', scope: '资料边界',
    routeCards: [
      { title: '1. 先核对现有队伍', description: '从浮生·渡尘与瑟莉姆条目确认已公开定位，不用历史配队结论替代当前客户端。', href: '/hi3/characters', action: '查看角色与人偶' },
      { title: '2. 再对照装备闭环', description: '查看朱华、PRI-ARM 与忧郁哲人圣痕的公告资料，再判断是否解决实际装备缺口。', href: '/hi3/weapons', action: '查看装备条目' },
      { title: '3. 最后核对资源与资格', description: '打开资源与回归清单，确认当前材料、锻造、补给和回归资格，而不是引用历史活动状态。', href: '/hi3/guides/v9-0-resource-returnee-checklist', action: '打开资源核对' },
    ],
    scopeText: '本页不是实时补给表，也不对未公布的卡池、强度或后续版本作预测。页面仅把已收录的官方信息转成便于浏览的版本档案。',
    guides: '查看资源与回归核对', characters: '查看女武神与人偶资料', materialIndex: '查看装备与锻造材料',
  },
  en: {
    eyebrow: 'Version archive', title: 'Honkai Impact 3rd v9.0: The Light at Dream\'s End Archive',
    intro: 'A browsable record of AstralOp and stigma entries already collected here and directly verifiable from the official v9.0 notice. Always use the client and the latest official notices for live supplies, events, eligibility, and full values.',
    astralOps: 'AstralOps', stigmas: 'Stigma sets', weapons: 'Gear archive', materials: 'Crafting and event resources', route: 'A practical v9.0 reading order', version: 'Recorded version', scope: 'Data scope',
    routeCards: [
      { title: '1. Audit your current roster', description: 'Use Fenghuang of Vicissitude and Senadina entries for published positioning, rather than substituting old team advice for the live client.', href: '/hi3/characters', action: 'Browse battlesuits and AstralOps' },
      { title: '2. Check the gear loop', description: 'Review Vermillion Liuli, its PRI-ARM, and Weeping Philosopher notice data before deciding whether they fill a real gear gap.', href: '/hi3/weapons', action: 'Browse gear entries' },
      { title: '3. Verify resources and eligibility', description: 'Open the resource and returnee checklist to verify live materials, crafting, supplies, and returnee eligibility instead of relying on historical event states.', href: '/hi3/guides/v9-0-resource-returnee-checklist', action: 'Open resource checks' },
    ],
    scopeText: 'This is not a live supply schedule and does not predict unannounced banners, power levels, or later versions. It turns the collected official information into a browsable archive.',
    guides: 'Check resources and returnee support', characters: 'Browse battlesuit and AstralOp entries', materialIndex: 'Browse gear and crafting materials',
  },
  ja: {
    eyebrow: 'バージョンアーカイブ', title: '崩壊3rd Ver.9.0「曙夢向明」公開情報アーカイブ',
    intro: '本サイトに収録済みで、Ver.9.0公式告知から直接確認できる人偶と聖痕の一覧です。現在の補給、イベント、資格、全数値はクライアントと最新公式告知を基準にしてください。',
    astralOps: '協同人偶', stigmas: '聖痕セット', weapons: '装備アーカイブ', materials: '鍛造・イベント資源', route: 'Ver.9.0資料を見る順番', version: '収録バージョン', scope: '情報の範囲',
    routeCards: [
      { title: '1. 所持編成を確認', description: '浮生・渡塵とセナディナの公開済み役割を確認し、古い編成結論を現行クライアントの代わりにしません。', href: '/hi3/characters', action: '戦乙女・人偶を見る' },
      { title: '2. 装備の循環を確認', description: '朱華、PRI-ARM、憂鬱な哲人の告知資料を見て、実際の装備不足を埋めるか判断します。', href: '/hi3/weapons', action: '装備条目を見る' },
      { title: '3. 資源・資格を確認', description: '資源・復帰チェックを開き、過去イベントの状態ではなく現在の素材、鍛造、補給、復帰資格を確認します。', href: '/hi3/guides/v9-0-resource-returnee-checklist', action: '資源チェックを開く' },
    ],
    scopeText: '本ページはリアルタイムの補給表ではなく、未発表バナー、強さ、後続バージョンを予測しません。収録済みの公式情報を閲覧しやすい形に整理します。',
    guides: '資源・復帰支援の確認', characters: '戦乙女・人偶資料を見る', materialIndex: '装備・鍛造素材を見る',
  },
} as const;

export function getHi3ArchiveMetadata(locale: SupportedLocale) {
  return { title: COPY[locale].title, description: COPY[locale].intro };
}

export function Hi3VersionArchive({ locale }: { locale: SupportedLocale }) {
  const copy = COPY[locale];
  const astralOps = hi3AstralOps.map((entry) => ({
    id: entry.id,
    title: getHi3AstralOpName(entry, locale),
    subtitle: locale === 'zh' ? entry.role : locale === 'ja' ? entry.roleJa : entry.roleEn,
    description: getHi3AstralOpDescription(entry, locale),
    version: entry.releaseVersion,
  }));
  const stigmas = hi3StigmaSets.map((entry) => ({
    id: entry.id,
    title: getHi3StigmaSetName(entry, locale),
    description: getHi3StigmaSetDescription(entry, locale),
    version: entry.releaseVersion,
    href: entry.id === 'weeping-philosopher'
      ? '/hi3/guides/v9-0-resource-returnee-checklist'
      : '/hi3/guides/new-returning-captain-route',
  }));
  const weapons = hi3Weapons.map((entry) => ({
    id: entry.id,
    name: getHi3WeaponName(entry, locale),
    type: entry.weaponTypeEn,
    description: locale === 'zh' ? entry.description : locale === 'ja' ? entry.descriptionJa : entry.descriptionEn,
  }));
  const materials = hi3Materials.map((entry) => ({
    id: entry.id,
    name: getHi3MaterialName(entry, locale),
    type: entry.type,
    source: locale === 'zh' ? entry.source : locale === 'ja' ? entry.sourceJa : entry.sourceEn,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-game-text-muted">
        <Link href="/hi3" className="hover:text-game-primary">{GAMES.hi3.name[locale]}</Link><span className="px-1">/</span><span className="text-game-text">{copy.eyebrow}</span>
      </nav>
      <header className="max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-game-primary">{copy.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold text-game-text sm:text-4xl">{copy.title}</h1>
        <p className="mt-4 leading-7 text-game-text-muted">{copy.intro}</p>
        <a href="https://honkaiimpact3.hoyoverse.com/global/en-us/news/165770" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-game-primary hover:underline">{locale === 'zh' ? '来源：全球服 9.0 官方更新公告（英文）' : locale === 'ja' ? '出典：グローバル版Ver.9.0公式更新告知（英語）' : 'Source: Global v9.0 official update announcement (English)'}</a>
      </header>
      <section className="mt-10" aria-labelledby="hi3-route">
        <h2 id="hi3-route" className="text-xl font-bold text-game-text">{copy.route}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">{copy.routeCards.map((entry) => <Link key={entry.href} href={entry.href} className="rounded-lg border border-game-border bg-game-surface p-5 hover:border-game-primary"><h3 className="text-lg font-semibold text-game-text">{entry.title}</h3><p className="mt-3 text-sm leading-6 text-game-text-muted">{entry.description}</p><span className="mt-4 inline-block text-sm font-medium text-game-primary">{entry.action}</span></Link>)}</div>
      </section>
      <section className="mt-10" aria-labelledby="hi3-astralops">
        <h2 id="hi3-astralops" className="text-xl font-bold text-game-text">{copy.astralOps}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">{astralOps.map((entry) => <article key={entry.id} className="rounded-lg border border-game-border bg-game-surface p-5"><p className="text-xs font-semibold uppercase tracking-wide text-game-primary">{entry.subtitle}</p><h3 className="mt-1 text-lg font-semibold text-game-text">{entry.title}</h3><p className="mt-3 text-sm leading-6 text-game-text-muted">{entry.description}</p><p className="mt-4 text-xs text-game-text-muted">{copy.version}: v{entry.version}</p></article>)}</div>
      </section>
      <section className="mt-10" aria-labelledby="hi3-stigmas">
        <h2 id="hi3-stigmas" className="text-xl font-bold text-game-text">{copy.stigmas}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">{stigmas.map((entry) => <Link key={entry.id} href={entry.href} className="rounded-lg border border-game-border bg-game-surface p-5 hover:border-game-primary"><h3 className="text-lg font-semibold text-game-text">{entry.title}</h3><p className="mt-3 text-sm leading-6 text-game-text-muted">{entry.description}</p><p className="mt-4 text-xs text-game-text-muted">{copy.version}: v{entry.version}</p></Link>)}</div>
      </section>
      <section className="mt-10" aria-labelledby="hi3-weapons">
        <h2 id="hi3-weapons" className="text-xl font-bold text-game-text">{copy.weapons}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">{weapons.map((entry) => <Link key={entry.id} href={`/hi3/weapons/${entry.id}`} className="rounded-lg border border-game-border bg-game-surface p-5 hover:border-game-primary"><p className="text-xs font-semibold uppercase tracking-wide text-game-primary">{entry.type}</p><h3 className="mt-1 text-lg font-semibold text-game-text">{entry.name}</h3><p className="mt-3 text-sm leading-6 text-game-text-muted">{entry.description}</p></Link>)}</div>
      </section>
      <section className="mt-10" aria-labelledby="hi3-materials">
        <h2 id="hi3-materials" className="text-xl font-bold text-game-text">{copy.materials}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">{materials.map((entry) => <Link key={entry.id} href={`/hi3/items/${entry.id}`} className="rounded-lg border border-game-border bg-game-surface p-5 hover:border-game-primary"><p className="text-xs font-semibold uppercase tracking-wide text-game-primary">{entry.type}</p><h3 className="mt-1 text-lg font-semibold text-game-text">{entry.name}</h3><p className="mt-3 text-sm leading-6 text-game-text-muted">{entry.source}</p></Link>)}</div>
      </section>
      <section className="mt-10 rounded-lg border border-game-border bg-game-surface p-5"><h2 className="font-semibold text-game-text">{copy.scope}</h2><p className="mt-2 text-sm leading-6 text-game-text-muted">{copy.scopeText}</p></section>
      <Hi3ClientChecklist locale={locale} />
      <nav className="mt-8 grid gap-3 md:grid-cols-3" aria-label="Related Honkai Impact 3rd pages">
        <Link href="/hi3/guides/v9-0-resource-returnee-checklist" className="rounded-lg border border-game-border bg-game-surface p-4 text-sm font-medium text-game-text hover:border-game-primary hover:text-game-primary">{copy.guides}</Link>
        <Link href="/hi3/characters" className="rounded-lg border border-game-border bg-game-surface p-4 text-sm font-medium text-game-text hover:border-game-primary hover:text-game-primary">{copy.characters}</Link>
        <Link href="/hi3/items" className="rounded-lg border border-game-border bg-game-surface p-4 text-sm font-medium text-game-text hover:border-game-primary hover:text-game-primary">{copy.materialIndex}</Link>
      </nav>
    </div>
  );
}
