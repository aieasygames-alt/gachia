import { serializeJsonLd } from '@/lib/jsonld-script';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/navigation';
import { THREE_GAME_STATUS_UPDATED_AT } from '@/lib/three-game-status';
import { THREE_GAME_UPDATE_RADAR } from '@/lib/three-game-update-radar';

const BASE_URL = 'https://gachia.com';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (lang !== 'zh') return {};
  return {
    title: '三游戏更新雷达 | Gachia',
    description: '按已上线、测试中、测试后与待开服阶段安排伊莫、蓝色星原：旅谣与绿梦：时空之声的下一轮内容核验重点。',
    alternates: { canonical: `${BASE_URL}/zh/update-radar` },
  };
}

export default async function UpdateRadarPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (lang !== 'zh') notFound();

  return <div className="container mx-auto max-w-6xl px-4 py-10 md:py-14">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: '三游戏更新雷达', url: `${BASE_URL}/zh/update-radar`, dateModified: THREE_GAME_STATUS_UPDATED_AT }) }} />
    <p className="text-sm font-semibold text-game-primary">更新雷达 · 最后核验 {THREE_GAME_STATUS_UPDATED_AT}</p>
    <h1 className="mt-2 text-3xl font-bold text-game-text md:text-4xl">三游戏更新雷达</h1>
    <p className="mt-4 max-w-3xl leading-7 text-game-text-muted">把伊莫、蓝色星原：旅谣和绿梦放在各自的内容阶段中处理。每项都先确认来源、版本或测试轮次，再把可执行结论写入对应行动页。</p>

    <section className="mt-10 grid gap-5 lg:grid-cols-3">
      {THREE_GAME_UPDATE_RADAR.map((item) => {
        const state = item.status === 'live' ? '已上线' : item.status === 'test' ? '测试中' : item.status === 'post-test' ? '测试已结束' : '待开服';
        return <article key={item.id} className="rounded-lg border border-game-border bg-game-surface p-5">
          <p className="text-xs font-semibold text-game-primary">{state} · {item.focus.title}</p>
          <h2 className="mt-2 text-xl font-semibold text-game-text">{item.title}</h2>
          <p className="mt-3 text-sm leading-6 text-game-text-muted">{item.focus.description}</p>
          <ul className="mt-5 space-y-3 border-t border-game-border pt-4">
            {item.focus.checklist.map((entry) => <li key={entry} className="flex gap-2 text-sm leading-6 text-game-text-muted"><span className="font-semibold text-game-primary" aria-hidden="true">·</span>{entry}</li>)}
          </ul>
          <Link href={item.href as '/'} className="mt-6 inline-flex text-sm font-semibold text-game-primary hover:underline">{item.action} <span aria-hidden="true" className="ml-1">→</span></Link>
        </article>;
      })}
    </section>

    <section className="mt-10 rounded-lg border border-game-border bg-game-surface-alt p-5 md:p-6">
      <h2 className="text-xl font-semibold text-game-text">发布前统一检查</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-game-text-muted">不要用旧截图、单条社区讨论或测试体验替代正式公告。每次更新都应留下适用条件、来源、核验日期，以及已确认与待确认内容的边界。</p>
      <Link href="/content-verification" className="mt-4 inline-flex text-sm font-semibold text-game-primary hover:underline">查看三游戏内容核验规则 <span aria-hidden="true" className="ml-1">→</span></Link>
    </section>
  </div>;
}
