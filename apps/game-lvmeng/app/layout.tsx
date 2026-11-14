import type { Metadata } from 'next';
import { AdsensePreferences } from '../../../packages/ui/adsense';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://gachia.com'),
  title: '绿梦：时空之声 | Gachia',
  description: '绿梦：时空之声公测信息、官方入口与已核验资料。',
  robots: process.env.LVMENG_DEPLOYMENT_MODE === 'preview' ? { index: false, follow: false } : undefined,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN"><body><AdsensePreferences />{children}</body></html>;
}
