import type { SupportedLocale } from '@gachia/core';
import { redeemCodes } from '@/lib/data';
import { previewMetadata } from '@/lib/seo';
import { NteNav } from '@/components/nte-nav';
import Link from 'next/link';


const copy = {
  zh: { title: '异环兑换码：奖励、状态与兑换说明', intro: '整理已收录兑换码的奖励、地区、来源、公布和到期记录。代码会随活动变化，页面记录不等于当前必定可用，请以游戏内兑换结果和官方公告为准。', active: '可用记录', history: '历史记录', reward: '奖励', status: '状态', region: '地区', source: '来源', revealed: '公布', expires: '到期', expired: '已过期', check: '待游戏内确认', steps: '兑换前检查' },
  en: { title: 'NTE Redeem Codes: Rewards and Status', intro: 'Browse recorded code rewards, region, source, reveal dates, and expiry records. Codes change with events; a listed record is not a guarantee of availability. Verify in game and through official notices.', active: 'Active records', history: 'Historical records', reward: 'Rewards', status: 'Status', region: 'Region', source: 'Source', revealed: 'Revealed', expires: 'Expires', expired: 'Expired', check: 'Check in game', steps: 'Before redeeming' },
  ja: { title: 'NTE 交換コード：報酬と状態', intro: '収録済みコードの報酬、地域、出典、公開日、期限を確認できます。コードはイベントで変動するため、掲載は利用可能性を保証しません。ゲーム内と公式告知で確認してください。', active: '有効な記録', history: '履歴', reward: '報酬', status: '状態', region: '地域', source: '出典', revealed: '公開', expires: '期限', expired: '期限切れ', check: 'ゲーム内で確認', steps: '交換前の確認' },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) { const locale = (await params).lang as SupportedLocale; const t = copy[locale]; return previewMetadata(t.title, t.intro, locale, '/redeem-codes'); }

export default async function RedeemCodes({ params }: { params: Promise<{ lang: string }> }) {
  const locale = (await params).lang as SupportedLocale;
  const t = copy[locale];
  const active = redeemCodes.filter((code) => code.status === 'active');
  const structuredData = [{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Gachia', item: `https://gachia.com/${locale}` }, { '@type': 'ListItem', position: 2, name: 'NTE', item: `https://gachia.com/${locale}/nte` }, { '@type': 'ListItem', position: 3, name: t.title, item: `https://gachia.com/${locale}/nte/redeem-codes` }] }];
  const CodeCard = ({ code }: { code: typeof redeemCodes[number] }) => <article className="card"><div className="card__title code">{code.code}</div><div className="code-meta"><span>{t.status}: <strong>{code.status === 'expired' ? t.expired : code.status === 'active' ? 'Active' : t.check}</strong></span><span>{t.region}: {code.region}</span><span>{t.source}: {code.source}</span></div><p><strong>{t.reward}:</strong> {locale === 'zh' ? code.reward : code.rewardEn}</p><div className="card__meta">{t.revealed}: {code.revealedAt} · {t.expires}: {code.expiresAt}</div></article>;
  return <><NteNav locale={locale} current="redeem-codes"/><main id="main-content" tabIndex={-1} className="content">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <div className="eyebrow">NTE Rewards</div><h1>{t.title}</h1><p className="lead">{t.intro}</p>
    <section className="detail-section"><h2>{t.steps}</h2><div className="grid">
      <article className="card"><div className="card__title">{locale === 'zh' ? '确认地区' : 'Check region'}</div><p>{locale === 'zh' ? '先确认代码对应的服务器或地区，避免跨服代码无法使用。' : 'Confirm the code server or region before redeeming.'}</p></article>
      <article className="card"><div className="card__title">{locale === 'zh' ? '确认状态' : 'Check status'}</div><p>{locale === 'zh' ? '活动可能提前结束或追加新码，优先以游戏内兑换结果为准。' : 'Events can end early or add new codes; use the in-game result as the source of truth.'}</p></article>
      <article className="card"><div className="card__title">{locale === 'zh' ? '保存记录' : 'Keep a record'}</div><p>{locale === 'zh' ? '兑换后检查邮件和背包，再回到版本页规划资源。' : 'Check mail and inventory after redeeming, then return to resource planning.'}</p></article>
    </div></section>
    {active.length > 0 && <section className="detail-section"><h2>{t.active}</h2><div className="grid">{active.map((code) => <CodeCard key={code.code} code={code}/>)}</div></section>}
    <section className="detail-section"><h2>{t.history}</h2><div className="grid">{redeemCodes.filter((code) => code.status !== 'active').map((code) => <CodeCard key={code.code} code={code}/>)}</div></section>
    <div className="link-list"><Link href={`/${locale}/nte/version`}>{locale === 'zh' ? '版本专题' : 'Version hub'}</Link><Link href={`/${locale}/nte/events`}>{locale === 'zh' ? '活动与维护' : 'Events'}</Link><Link href={`/${locale}/nte/gacha`}>{locale === 'zh' ? '抽卡与保底' : 'Gacha'}</Link></div>
  </main></>;
}
