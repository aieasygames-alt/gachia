import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/navigation';

const BASE_URL = 'https://gachia.com';
const UPDATED_AT = '2026-09-30';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (lang !== 'zh') return {};
  return {
    title: '三游戏内容核验规则 | Gachia',
    description: '伊莫、蓝色星原：旅谣与绿梦：时空之声的内容状态、来源分层与更新发布规则。',
    alternates: { canonical: `${BASE_URL}/zh/content-verification` },
  };
}

export default async function ContentVerificationPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (lang !== 'zh') notFound();

  const levels = [
    { title: '官方已确认', description: '可由官网、官方公告、商店页或当前正式客户端直接复核。发布时仍保留来源与核验日期。' },
    { title: '测试参考', description: '用于理解当前测试的系统、流程和体验，但不用于推导正式版数值、概率、奖励、效率或上线规则。' },
    { title: '待核验', description: '社区讨论、单次录像、旧截图或未被官方说明支持的信息。可保留为观察问题，不作为站内事实或资源规划依据。' },
  ];
  const requiredFields = ['适用版本或测试轮次', '来源链接或客户端位置', '核验日期', '平台、地区和前置条件', '已确认内容与待确认内容的边界'];
  const destinations = [
    { label: '伊莫 S1 入坑检查台', href: '/zh/aniimo/s1-check', note: '已上线内容：下载、首日路线、虹光、家园、地图与奖励状态。' },
    { label: '蓝色星原旅迹测试核验台', href: '/zh/azur-promilia/travel-trace', note: '测试内容：奇波、家园、养成、抽取和反馈记录按来源状态分层。' },
    { label: '绿梦开服核验台', href: '/zh/lvmeng/launch-check', note: '待开服内容：安装、账号、功能解锁、奖励与可发布资料记录。' },
  ];

  return <main className="container mx-auto max-w-5xl px-4 py-10 md:py-14">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebPage', name: '三游戏内容核验规则', url: `${BASE_URL}/zh/content-verification`, dateModified: UPDATED_AT }) }} />
    <p className="text-sm font-semibold text-game-primary">内容治理 · 最后核验 {UPDATED_AT}</p>
    <h1 className="mt-2 text-3xl font-bold text-game-text md:text-4xl">三游戏内容核验规则</h1>
    <p className="mt-4 max-w-3xl leading-7 text-game-text-muted">伊莫、蓝色星原：旅谣和绿梦处于不同阶段。本站将“已上线”“测试中”“待开服”的内容分开处理，避免把测试表现、预约页面或社区讨论写成正式客户端结论。</p>

    <section className="mt-10">
      <h2 className="text-xl font-semibold text-game-text">来源状态</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">{levels.map((level) => <article key={level.title} className="rounded-lg border border-game-border bg-game-surface p-5"><h3 className="font-semibold text-game-text">{level.title}</h3><p className="mt-2 text-sm leading-6 text-game-text-muted">{level.description}</p></article>)}</div>
    </section>

    <section className="mt-10">
      <h2 className="text-xl font-semibold text-game-text">每次更新必须保留</h2>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2">{requiredFields.map((field, index) => <li key={field} className="rounded-lg border border-game-border bg-game-surface-alt p-4 text-sm text-game-text-muted"><span className="mr-2 font-semibold text-game-primary">{index + 1}.</span>{field}</li>)}</ol>
    </section>

    <section className="mt-10">
      <h2 className="text-xl font-semibold text-game-text">对应行动页</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">{destinations.map((item) => <Link key={item.href} href={item.href as '/'} className="group rounded-lg border border-game-border bg-game-surface p-5 transition-colors hover:border-game-primary"><h3 className="font-semibold text-game-text group-hover:text-game-primary">{item.label}</h3><p className="mt-2 text-sm leading-6 text-game-text-muted">{item.note}</p><p className="mt-4 text-sm font-semibold text-game-primary">进入核验台 <span aria-hidden="true">→</span></p></Link>)}</div>
    </section>
  </main>;
}
