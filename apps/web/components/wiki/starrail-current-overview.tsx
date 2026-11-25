import type { SupportedLocale } from '@gachia/core';
import { loadStarRailUpdates } from '@/lib/starrail-publication';
import { Link } from '@/lib/i18n/navigation';

export async function StarRailCurrentOverview({ locale }: { locale: SupportedLocale }) {
  const result = await loadStarRailUpdates(locale);
  const version = result.updates.find(update => update.kind === 'version');
  const updates = [version, ...result.updates.filter(update => update.kind === 'banner'),
    ...result.updates.filter(update => update.kind === 'character')].filter(update => !!update);
  const copy = {
    zh: { heading: '当前版本与跃迁', empty: '当前语言的版本资料正在补充。中文资料按区服单独标注。', checked: '来源核验', open: '查看完整资料', version: '版本与近期更新', banner: '当前跃迁与规划', events: '活动日程' },
    en: { heading: 'Current version and warps', empty: 'Current updates in this language are being prepared. Chinese updates retain their regional scope.', checked: 'Source checked', open: 'Read full details', version: 'Version and updates', banner: 'Warps and planning', events: 'Event schedule' },
    ja: { heading: '現在のバージョンと跳躍', empty: 'この言語の更新情報は準備中です。中国語の資料には対象地域を明記しています。', checked: '出典確認', open: '詳細を見る', version: 'バージョンと更新', banner: '跳躍と計画', events: 'イベント日程' },
  }[locale];
  return <section className="mb-8 space-y-4 rounded-2xl border border-game-border bg-game-surface p-5">
    <h2 className="text-2xl font-bold text-game-text">{version?.currentVersion ? `${version.currentVersion} · ` : ''}{copy.heading}</h2>
    {!updates.length && <p className="text-sm text-game-text-muted">{copy.empty}</p>}
    <div className="grid gap-4 md:grid-cols-2">{updates.map(update => <article key={update.slug} className="rounded-xl bg-game-surface-alt p-4">
      <h3 className="font-semibold text-game-text">{update.title}</h3>
      <p className="mt-2 text-sm leading-6 text-game-text-muted">{update.summary}</p>
      <p className="mt-2 text-xs text-game-text-muted">{update.region} · {copy.checked} <time dateTime={update.checkedAt}>{update.checkedAt}</time></p>
      <Link className="mt-3 inline-block text-sm text-game-primary underline" href={`/starrail/version#${update.slug}` as '/'}>{copy.open}</Link>
    </article>)}</div>
    <nav className="flex flex-wrap gap-4 text-sm text-game-primary">
      <Link href="/starrail/version">{copy.version}</Link>
      <Link href="/starrail/guides/banner-schedule-guide">{copy.banner}</Link>
      <Link href="/starrail/events">{copy.events}</Link>
    </nav>
  </section>;
}
