import Link from 'next/link';
import { sourceStatusLabel, travelTraceVerification } from '@/lib/data';
import { asLocale, localize } from '@/lib/i18n';
import { metadata, url } from '@/lib/seo';
import { GameNav } from '@/components/game-nav';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const locale = asLocale((await params).lang);
  return metadata(
    locale,
    localize(locale, { zh: '蓝色星原：旅谣旅迹测试核验台', en: 'Azur Promilia Travel Trace Test Checks', ja: 'アズールプロミリア旅跡テスト確認台' }),
    localize(locale, { zh: '按来源状态核对旅迹测试的资格、奇波、家园、养成、抽取、奖励与反馈信息。', en: 'Check Travel Trace Test access, Kibo, homestead, progression, banners, rewards, and feedback by source status.', ja: '旅跡テストの参加資格、キボ、拠点、育成、バナー、報酬、フィードバックを出典状態ごとに確認します。' }),
    'travel-trace',
  );
}

export default async function TravelTracePage({ params }: { params: Promise<{ lang: string }> }) {
  const locale = asLocale((await params).lang);
  const title = localize(locale, { zh: '旅迹测试核验台', en: 'Travel Trace Test Checks', ja: '旅跡テスト確認台' });
  return <><GameNav locale={locale} current="travel-trace"/><main id="main-content" tabIndex={-1} className="content">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, url: url(locale, 'travel-trace') }) }} />
    <div className="eyebrow">Travel Trace Test</div>
    <h1>{title}</h1>
    <p className="lead">{localize(locale, {
      zh: '将社区最常讨论的测试问题拆成可核对项目：每项保留来源状态、当前行动和对应资料页。它用于记录测试现状，不预测公测规则。',
      en: 'Turns the most discussed test questions into checkable items. Each keeps a source status, a current action, and a related reference page. It records the test as it is and does not predict release rules.',
      ja: 'よく議論されるテスト項目を確認可能な単位に分けます。各項目には出典状態、現在の行動、関連資料ページを残します。テスト現状の記録であり、正式版規則の予測ではありません。',
    })}</p>
    <p className="notice">{localize(locale, {
      zh: '核验基线：2026 年 9 月 17 日开启的旅迹测试。客户端显示、官方公告和明确标注的测试参考应分开阅读；平衡、概率、产出、奖励和上线平台均可能调整。',
      en: 'Verification baseline: the Travel Trace Test that began September 17, 2026. Read client displays, official notices, and labelled test references separately; balance, rates, yields, rewards, and release platforms may change.',
      ja: '確認基準は2026年9月17日に始まった旅跡テストです。クライアント表示、公式告知、明示されたテスト参照を分けて読み、バランス、確率、産出、報酬、対応機種は変更される可能性があります。',
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
        <article className="card"><div className="card__title">1. {localize(locale, { zh: '先看状态', en: 'Check status first', ja: 'まず状態を確認' })}</div><p>{localize(locale, { zh: '确认公告日期、客户端版本和项目的来源状态，避免将旧测试内容带入当前版本。', en: 'Confirm the notice date, client version, and source status before carrying old test material into the current version.', ja: '告知日、クライアント版、出典状態を確認してから、古いテスト内容を現行版に持ち込まないようにします。' })}</p></article>
        <article className="card"><div className="card__title">2. {localize(locale, { zh: '再做记录', en: 'Then record evidence', ja: '次に根拠を記録' })}</div><p>{localize(locale, { zh: '记录前置条件、实际结果、地区和时间。单次体验可以是观察，不应自动变成通用规则。', en: 'Record prerequisites, actual result, region, and time. One experience can be an observation, not automatically a universal rule.', ja: '前提条件、実際の結果、地域、時間を記録します。一回の体験は観察であり、直ちに共通規則にはなりません。' })}</p></article>
        <article className="card"><div className="card__title">3. {localize(locale, { zh: '最后看改动', en: 'Track later changes', ja: '最後に変更を追跡' })}</div><p>{localize(locale, { zh: '后续以官方公告与新客户端复核；被调整的旧记录保留为测试参考，不覆盖新结论。', en: 'Recheck with later official notices and new clients; adjusted records remain test references and do not replace new conclusions.', ja: '後続の公式告知と新クライアントで再確認し、調整済みの記録はテスト参照として残し、新しい結論を上書きしません。' })}</p></article>
      </div>
    </section>
  </main></>;
}
