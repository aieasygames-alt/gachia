import type { Metadata } from 'next';
import { game, launchRewards } from '@/lib/data';

export const metadata: Metadata = { title: '绿梦：时空之声版本动态 | Gachia', description: '绿梦：时空之声公测时间与版本信息核验状态。', alternates: { canonical: 'https://gachia.com/zh/lvmeng/version' } };

export default function VersionPage() { return <main className="content"><div className="eyebrow">公测版本</div><h1>版本动态</h1><section className="facts"><div className="fact"><span>状态</span><strong>全平台公测定档</strong></div><div className="fact"><span>日期</span><strong>{game.launchDate}</strong></div><div className="fact"><span>平台</span><strong>{game.platforms.join(' / ')}</strong></div></section><h2>官方预约里程碑奖励</h2><div className="grid">{launchRewards.map((reward) => <article className="card" key={reward.item}><h3>{reward.item}</h3><p>{reward.note}</p></article>)}</div><h2>上线前待核验</h2><ul><li>各平台具体预下载、开服时间与安装包入口。</li><li>账号互通、服务器划分、首发版本号与更新说明。</li><li>首发角色、活动、卡池规则、概率与兑换码。</li></ul></main> }
