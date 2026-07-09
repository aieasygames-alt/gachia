import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Gachia — 多游戏开放世界 Wiki',
    template: '%s | Gachia',
  },
  description: '一站式开放世界游戏数据库，覆盖原神、崩铁、鸣潮、异环、绝区零、归环、遗忘之海、失控进化等游戏的角色图鉴、武器与材料数据、配装推荐、版本攻略和最新热点入口。',
  metadataBase: new URL('https://gachia.com'),
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: 'Gachia',
    images: [{ url: '/images/og/default.jpg', width: 1200, height: 630, alt: 'Gachia — Multi-Game Open World Wiki' }],
  },
  // P1-19: Add Twitter Card metadata for better social sharing
  twitter: {
    card: 'summary_large_image',
    title: 'Gachia — 多游戏开放世界 Wiki',
    description: '一站式开放世界游戏数据库，覆盖原神、崩铁、鸣潮、异环、绝区零、归环、遗忘之海、失控进化等游戏的角色图鉴、武器与材料数据、配装推荐、版本攻略和最新热点入口。',
    images: ['/images/og/default.jpg'],
    site: '@gachia',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
