import Link from 'next/link';
import type { SupportedLocale } from '@gachia/core';
import { NteNav } from '@/components/nte-nav';
import { nteMetadata } from '@/lib/metadata';
import { versionCheckRoute } from '@/lib/data';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  return nteMetadata((await params).lang as SupportedLocale, 'events', { zh: '异环 1.4 活动与版本事件', en: 'NTE v1.4 Events', ja: 'NTE v1.4 イベント' }, { zh: '异环 1.4 当前活动、维护与限时奖励核验。', en: 'NTE v1.4 events, maintenance, and limited-reward checks.', ja: '異環v1.4のイベント、メンテナンス、期間限定報酬を確認。' });
}

export default async function Events({ params }: { params: Promise<{ lang: string }> }) {
  const locale = (await params).lang as SupportedLocale;
  const ja = locale === 'ja';
  const title = locale === 'zh' ? '异环活动与版本事件' : ja ? 'NTE イベントとバージョン情報' : 'NTE Events & Version Events';
  const description = locale === 'zh' ? '异环 1.4 活动、维护、版本卡池与限时奖励规划参考。具体时间和规则以游戏内公告为准。' : ja ? '異環v1.4のイベント、メンテナンス、バナー、期間限定報酬の確認手順です。日時とルールはゲーム内のお知らせで確認してください。' : 'A planning reference for NTE v1.4 events, maintenance, banners, and limited rewards. Confirm dates and rules in official notices.';
  const jsonLd = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, description, url: `https://gachia.com/${locale}/nte/events`, inLanguage: locale === 'zh' ? 'zh-CN' : locale };

  return <><NteNav locale={locale} current="version"/><main id="main-content" tabIndex={-1} className="content">
    <div className="eyebrow">NTE v1.4</div><h1>{title}</h1><p className="lead">{description}</p>
    <section className="grid">
      <article className="card"><div className="card__title">{locale === 'zh' ? '1.4 官方公告' : ja ? 'v1.4 公式告知' : 'v1.4 official notices'}</div><p>{locale === 'zh' ? '先核对更新公告、维护说明、活动时间与参与条件；旧版本活动仅作历史资料。' : ja ? '更新告知、メンテナンス、イベント期間、参加条件を先に確認し、旧版イベントは履歴資料として扱います。' : 'Check update notes, maintenance, event timing, and requirements first; treat older events as historical reference.'}</p></article>
      <article className="card"><div className="card__title">{locale === 'zh' ? '版本卡池' : ja ? 'バージョンバナー' : 'Version banners'}</div><p>{locale === 'zh' ? '核对卡池剩余时间、当前抽数和保底资源，再决定是否投入。' : ja ? 'バナーの残り時間、現在の抽選回数、天井資源を確認してから判断します。' : 'Check banner time, current pity, and guarantee resources before spending.'}</p></article>
      <article className="card"><div className="card__title">{locale === 'zh' ? '活动检查清单' : ja ? 'イベント確認リスト' : 'Event checklist'}</div><p>{locale === 'zh' ? '登录后依次检查活动、兑换码、邮件和商店；具体奖励与规则以官方公告为准。' : ja ? 'ログイン後にイベント、コード、メール、ショップを順番に確認します。報酬とルールは公式告知を優先します。' : 'After login, check events, codes, mail, and shops in order; official notices take priority for rewards and rules.'}</p></article>
    </section>
    <section className="detail-section"><h2>{locale === 'zh' ? '完成本页后' : ja ? 'このページの後に確認すること' : 'After this page'}</h2><div className="grid">{versionCheckRoute.slice(1).map((item, index) => <Link className="card" href={`/${locale}/nte/${item.href}`} key={item.id}><div className="card__title">{index + 2}. {item.title[locale]}</div><p>{item.summary[locale]}</p></Link>)}</div></section>
    <div className="link-list"><Link href={`/${locale}/nte/version`}>{locale === 'zh' ? '版本专题' : ja ? 'バージョン情報' : 'Version hub'}</Link><Link href={`/${locale}/nte/redeem-codes`}>{locale === 'zh' ? '兑换码' : ja ? '交換コード' : 'Redeem codes'}</Link><Link href={`/${locale}/nte/merchant`}>{locale === 'zh' ? '商店规划' : ja ? 'ショップ計画' : 'Shop planning'}</Link></div>
  </main><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>;
}
