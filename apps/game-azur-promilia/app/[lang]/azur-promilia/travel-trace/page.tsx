import Link from 'next/link';
import { sourceStatusLabel, travelTraceVerification } from '@/lib/data';
import { asLocale, localize } from '@/lib/i18n';
import { metadata, url } from '@/lib/seo';
import { GameNav } from '@/components/game-nav';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const locale = asLocale((await params).lang);
  return metadata(
    locale,
    localize(locale, { zh: '蓝色星原：旅谣旅迹测试资料归档', en: 'Azur Promilia Travel Trace Test Archive', ja: 'アズールプロミリア旅跡テスト資料アーカイブ' }),
    localize(locale, { zh: '按来源状态归档旅迹测试的资格、奇波、家园、养成、抽取、奖励与反馈资料。', en: 'Archive Travel Trace Test access, Kibo, homestead, progression, banners, rewards, and feedback by source status.', ja: '旅跡テストの参加資格、キボ、拠点、育成、バナー、報酬、フィードバック資料を出典状態ごとにアーカイブします。' }),
    'travel-trace',
  );
}

export default async function TravelTracePage({ params }: { params: Promise<{ lang: string }> }) {
  const locale = asLocale((await params).lang);
  const title = localize(locale, { zh: '旅迹测试资料归档', en: 'Travel Trace Test Archive', ja: '旅跡テスト資料アーカイブ' });
  return <><GameNav locale={locale} current="travel-trace"/><main id="main-content" tabIndex={-1} className="content">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, url: url(locale, 'travel-trace') }) }} />
    <div className="eyebrow">Travel Trace Test</div>
    <h1>{title}</h1>
    <p className="lead">{localize(locale, {
      zh: '将社区最常讨论的测试问题拆成可核对的归档项目：每项保留来源状态、后续复核动作和对应资料页。它记录已结束测试的事实，不预测公测规则。',
      en: 'Turns the most discussed test questions into archiveable items. Each keeps a source status, a future re-check action, and a related reference page. It records an ended test and does not predict release rules.',
      ja: 'よく議論されたテスト項目を確認可能なアーカイブ単位に分けます。各項目には出典状態、今後の再確認アクション、関連資料ページを残します。終了したテストの記録であり、正式版規則の予測ではありません。',
    })}</p>
    <p className="notice">{localize(locale, {
      zh: '归档基线：旅迹测试于 2026 年 10 月 7 日 16:00（UTC+8）结束，服务器已关闭且测试数据不保留。客户端显示、官方公告和明确标注的测试参考应分开阅读；平衡、概率、产出、奖励和上线平台均须待未来官方版本重新核验。',
      en: 'Archive baseline: Travel Trace ended at 16:00 UTC+8 on October 7, 2026; servers are closed and test data was not retained. Read client displays, official notices, and labelled test references separately; balance, rates, yields, rewards, and release platforms need verification in a future official build.',
      ja: 'アーカイブ基準：旅跡テストは2026年10月7日16:00（UTC+8）に終了し、サーバーは閉鎖、テストデータは保持されません。クライアント表示、公式告知、明示されたテスト参照を分けて読み、バランス、確率、産出、報酬、対応機種は今後の公式版で再確認が必要です。',
    })}</p>
    <section className="grid">{travelTraceVerification.map((item) => <Link className="card" href={`/${locale}/azur-promilia/${item.href}`} key={item.id}>
      <div className="card__title">{item.label[locale]}</div>
      <div className="card__badge">{sourceStatusLabel(item.status, locale)}</div>
      <p>{item.summary[locale]}</p>
      <p className="card__meta"><strong>{localize(locale, { zh: '核验动作：', en: 'Check action: ', ja: '確認アクション：' })}</strong>{item.action[locale]}</p>
    </Link>)}</section>
    <section className="article">
      <h2>{localize(locale, { zh: '使用顺序', en: 'Recommended order', ja: '確認順序' })}</h2>
      <div className="grid">
        <article className="card"><div className="card__title">1. {localize(locale, { zh: '先看状态', en: 'Check status first', ja: 'まず状態を確認' })}</div><p>{localize(locale, { zh: '确认测试结束公告、记录日期和项目的来源状态，避免将旧测试内容带入正式版本。', en: 'Confirm the test-end notice, record date, and source status before carrying old test material into release.', ja: 'テスト終了告知、記録日、出典状態を確認してから、古いテスト内容を正式版に持ち込まないようにします。' })}</p></article>
        <article className="card"><div className="card__title">2. {localize(locale, { zh: '再读归档', en: 'Then read the archive', ja: '次にアーカイブを読む' })}</div><p>{localize(locale, { zh: '保留前置条件、实际结果、地区和时间。单次体验可以是历史观察，不应自动变成正式服通用规则。', en: 'Retain prerequisites, actual result, region, and time. One experience can be a historical observation, not automatically a release rule.', ja: '前提条件、実際の結果、地域、時間を残します。一回の体験は履歴上の観察であり、直ちに正式版の共通規則にはなりません。' })}</p></article>
        <article className="card"><div className="card__title">3. {localize(locale, { zh: '最后看改动', en: 'Track later changes', ja: '最後に変更を追跡' })}</div><p>{localize(locale, { zh: '后续以官方公告与新客户端复核；被调整的旧记录保留为测试参考，不覆盖新结论。', en: 'Recheck with later official notices and new clients; adjusted records remain test references and do not replace new conclusions.', ja: '後続の公式告知と新クライアントで再確認し、調整済みの記録はテスト参照として残し、新しい結論を上書きしません。' })}</p></article>
      </div>
    </section>
  </main></>;
}
