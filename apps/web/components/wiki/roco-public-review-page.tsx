import type { SupportedLocale } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';
import { ROCO_PUBLIC_REVIEW, ROCO_PUBLIC_REVIEW_DATE, type RocoReviewRoute } from '@/lib/roco-public-review';
import { ContentReviewNotice } from './content-review-notice';

export function RocoPublicReviewPage({ route, locale }: { route: RocoReviewRoute; locale: SupportedLocale }) {
  const copy = ROCO_PUBLIC_REVIEW[route][locale];
  return <article data-roco-public-review={route || 'home'} className="space-y-6">
    <h1 className="text-2xl font-bold text-game-primary">{copy.title}</h1>
    <p className="text-sm leading-relaxed text-game-text-muted">{copy.description}</p>
    <ContentReviewNotice reviewedAt={ROCO_PUBLIC_REVIEW_DATE} locale={locale} />
    <section className="rounded-lg border border-game-border bg-game-surface p-6">
      <h2 className="mb-4 text-lg font-semibold text-game-primary">{{ zh: '恢复资料前的核验条件', en: 'Checks before restoring information', ja: '資料を戻す前の確認条件' }[locale]}</h2>
      <ul className="list-disc space-y-3 pl-5 text-sm leading-relaxed text-game-text-muted">
        {copy.checks.map(check => <li key={check}>{check}</li>)}
      </ul>
    </section>
    <nav data-review-navigation className="flex flex-wrap gap-4 text-sm text-game-primary" aria-label={{ zh: '资料审核导航', en: 'Information review navigation', ja: '資料確認ナビ' }[locale]}>
      <Link href="/roco/version">{{ zh: '版本信息核验状态', en: 'Version information review', ja: '版本情報の確認状況' }[locale]}</Link>
      <Link href="/roco/characters">{{ zh: '历史角色导航（待核实）', en: 'Legacy character navigation (unverified)', ja: '過去キャラのナビ（未確認）' }[locale]}</Link>
      <Link href="/roco/guides">{{ zh: '攻略与核验清单（非全部核实）', en: 'Guides and checklists (not fully verified)', ja: 'ガイドと確認リスト（全件検証済みではありません）' }[locale]}</Link>
    </nav>
  </article>;
}
