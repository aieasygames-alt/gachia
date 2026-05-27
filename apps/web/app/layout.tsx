import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Gachia — 多游戏开放世界 Wiki',
    template: '%s | Gachia',
  },
  description: '一站式二次元开放世界游戏数据库，覆盖原神、崩铁、鸣潮、异环等游戏的角色图鉴、武器数据、攻略百科。',
  metadataBase: new URL('https://gachia.com'),
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: 'Gachia',
    images: [{ url: '/images/og/default.jpg', width: 1200, height: 630, alt: 'Gachia — Multi-Game Open World Wiki' }],
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
