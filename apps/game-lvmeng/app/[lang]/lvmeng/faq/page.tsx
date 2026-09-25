import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentStatus } from '@/components/content-status';
import { launchFaq } from '@/lib/data';

export const metadata: Metadata = {
  title: '绿梦：时空之声常见问题 | Gachia',
  description: '绿梦：时空之声公测时间、平台、预约下载、奖励、兑换码与测试资料边界。',
  alternates: { canonical: 'https://gachia.com/zh/lvmeng/faq' },
};

export default function FaqPage() {
  return <main className="content">
    <div className="eyebrow">公测信息答疑</div>
    <h1>常见问题</h1>
    <p className="lead">优先回答开服前会影响预约、下载和首日决策的问题。官方尚未公开的内容会保持待核验状态。</p>
    <ContentStatus />
    <div className="faq-list">{launchFaq.map((item) => <section className="faq-item" key={item.question}><h2>{item.question}</h2><p>{item.answer}</p></section>)}</div>
    <div className="link-list"><Link href="/zh/lvmeng/download">预约 / 下载</Link><Link href="/zh/lvmeng/news">公告活动</Link><Link href="/zh/lvmeng/redeem-codes">兑换码</Link><Link href="/zh/lvmeng/guides">入门与系统</Link></div>
  </main>;
}
