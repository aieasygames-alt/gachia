import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Gachia — 一站式二次元开放世界游戏数据库',
    template: '%s | Gachia',
  },
  description: '一站式二次元开放世界游戏数据库，覆盖原神、崩坏：星穹铁道、鸣潮、异环、绝区零、归环、无限大、明日方舟：终末地、遗忘之海和失控进化，提供角色图鉴、武器数据、配装推荐、版本攻略与热点入口。',
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
    title: 'Gachia — 一站式二次元开放世界游戏数据库',
    description: '一站式二次元开放世界游戏数据库，覆盖原神、崩坏：星穹铁道、鸣潮、异环、绝区零、归环、无限大、明日方舟：终末地、遗忘之海和失控进化，提供角色图鉴、武器数据、配装推荐、版本攻略与热点入口。',
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
