import { GAMES, GAME_IDS, LOCALES } from '@gachia/core';
import type { Metadata } from 'next';
import { Link } from '@/lib/i18n/navigation';
import { buildLocalizedAlternates } from '@/lib/seo-metadata';

const copy = {
  zh: { title: '更多游戏', description: '浏览 Gachia 收录的全部游戏资料站。' },
  en: { title: 'More games', description: 'Browse every game hub available on Gachia.' },
  ja: { title: 'その他のゲーム', description: 'Gachia に掲載しているゲームハブを一覧で確認できます。' },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const locale = (await params).lang as keyof typeof copy;
  const text = copy[locale] ?? copy.zh;
  return { title: text.title, description: text.description, alternates: buildLocalizedAlternates(locale, (lang) => `/${lang}/games`, LOCALES) };
}

export default async function GamesPage({ params }: { params: Promise<{ lang: string }> }) {
  const locale = (await params).lang as keyof typeof copy;
  const text = copy[locale] ?? copy.zh;
  return <div className="container mx-auto max-w-6xl px-4 py-12"><div className="mb-8"><p className="text-sm font-semibold uppercase text-game-primary">Gachia</p><h1 className="mt-2 text-3xl font-black text-game-text">{text.title}</h1><p className="mt-3 text-game-text-muted">{text.description}</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{GAME_IDS.map((gameId) => <Link key={gameId} href={`/${gameId}` as '/'} className="rounded-lg border border-game-border bg-game-surface p-5 transition-colors hover:border-game-primary"><h2 className="font-bold text-game-text">{GAMES[gameId].name[locale as 'zh' | 'en' | 'ja']}</h2></Link>)}</div></div>;
}
