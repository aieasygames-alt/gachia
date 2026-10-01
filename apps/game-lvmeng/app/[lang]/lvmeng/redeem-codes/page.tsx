import type { Metadata } from 'next';
import { redeemCodeStatus } from '@/lib/data';

export const metadata: Metadata = { title: '绿梦：时空之声兑换码 | Gachia', description: '绿梦：时空之声官方兑换码核验状态。', alternates: { canonical: 'https://gachia.com/zh/lvmeng/redeem-codes' } };

export default function RedeemCodesPage() { return <main id="main-content" tabIndex={-1} className="content"><div className="eyebrow">官方核验状态</div><h1>兑换码</h1><div className="notice">截至 {redeemCodeStatus.verifiedAt}，本站未收录可由官方公开来源核验的公测兑换码。</div><p>预约里程碑奖励、测试返还和兑换码是不同的发放机制。公测后仅在官方公告明确给出兑换方式、适用平台、有效期与奖励内容时才会更新本页。</p><h2>兑换前确认</h2><ol className="checklist">{redeemCodeStatus.redemptionSteps.map((step) => <li key={step}>{step}</li>)}</ol><h2>收录规则</h2><p>每条有效码将显示奖励、适用范围、截止时间和官方来源；过期码会保留失效状态，不会混入可用列表。</p></main> }
