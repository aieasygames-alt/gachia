import type { SupportedLocale } from '@gachia/core';

export function ContentReviewNotice({ reviewedAt, locale, proposalArchive = false }: { reviewedAt: string; locale: SupportedLocale; proposalArchive?: boolean }) {
  if (proposalArchive) return <aside data-content-review="editorial_proposal_archive" className="mb-6 rounded-lg border border-game-border bg-game-surface p-4 text-sm leading-relaxed text-game-text-muted">
    <p className="font-semibold text-game-text">{{ zh: '非官方编辑设想归档', en: 'Unofficial editorial proposal archive', ja: '非公式の編集提案アーカイブ' }[locale]}</p>
    <p>{{
      zh: '旧文是面向游戏开发方的设计与运营建议，不是玩家攻略、官方路线图或本站已实施功能。原文已转入内部审查档案，本页只保留主题与适用边界。不应据此报名、付款、下载或决定培养；暂不提交搜索索引，归档也不表示游戏内容不存在或被取消。',
      en: 'The original was design and operations advice to a game developer, not a player guide, official roadmap or implemented site feature. Originals are retained in an internal review archive; this page preserves only the topic and limits. Do not use it for signup, payment, downloads or investment. Search submission is withheld; archival does not establish nonexistence or cancellation.',
      ja: '原文はゲーム開発者への設計・運営提案であり、プレイヤー攻略・公式計画・本站の実装済み機能ではありません。原文は内部審査記録に保存し、本ページは主題と適用範囲のみを残します。応募・支払い・DL・育成に使わないでください。検索提出を保留しますが、ゲーム内容の不存在や中止を意味しません。',
    }[locale]}</p>
    <p className="mt-2 text-xs">{{ zh: '编辑归类日（非游戏核验日）', en: 'Editorial classification (not game verification)', ja: '編集分類日（ゲームの検証日ではありません）' }[locale]}: {reviewedAt}</p>
  </aside>;
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
