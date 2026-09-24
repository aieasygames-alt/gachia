import type { Metadata } from 'next';
import './globals.css';

const isPreview = process.env.GENSHIN_DEPLOYMENT_MODE !== 'production';

export const metadata: Metadata = {
  metadataBase: new URL('https://gachia.com'),
  robots: isPreview ? { index: false, follow: false } : undefined,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hans"><body>{children}</body></html>;
}
