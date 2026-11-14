import type { Metadata } from 'next';
import { AdsensePreferences } from '../../../packages/ui/adsense';
import './globals.css';

const isPreview = process.env.AZUR_PROMILIA_DEPLOYMENT_MODE !== 'production';

export const metadata: Metadata = {
  metadataBase: new URL('https://gachia.com'),
  robots: isPreview ? { index: false, follow: false } : undefined,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hans"><body><AdsensePreferences /><div className="page-shell">{children}</div></body></html>;
}
