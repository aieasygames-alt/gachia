import type { SupportedLocale } from '@gachia/core';

export function ContentReviewNotice({ reviewedAt, locale }: { reviewedAt: string; locale: SupportedLocale }) {
  return <aside data-content-review className="mb-6 rounded-lg border border-game-border bg-game-surface p-4 text-sm leading-relaxed text-game-text-muted">
    <p className="font-semibold text-game-text">{{ zh: '资料待核实', en: 'Information under review', ja: '資料確認中' }[locale]}</p>
    <p>{{
      zh: '缺乏独立依据的确定断言已撤回。保留页面和历史导航标签不代表官方确认；不应据此报名、付款、下载或决定培养。本页暂不提交搜索索引，也不表示测试取消或相关内容不存在。',
      en: 'Definite claims lacking independent support are withdrawn. Retained pages and legacy navigation labels are not official confirmation. Do not rely on them for signup, payment, downloads or investment. This page is withheld from search submission, not declared cancelled or nonexistent.',
      ja: '独立した根拠のない断定を撤回しました。ページや過去の分類を残すことは公式確認ではありません。応募・支払い・DL・育成判断の根拠にしないでください。検索提出を保留していますが、中止や不存在を意味しません。',
    }[locale]}</p>
    <p className="mt-2 text-xs">{{ zh: '编辑纠错日（非游戏核验日）', en: 'Editorial correction (not game verification)', ja: '編集訂正日（ゲームの検証日ではありません）' }[locale]}: {reviewedAt}</p>
  </aside>;
}
