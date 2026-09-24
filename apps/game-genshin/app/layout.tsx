import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { metadataBase: new URL('https://gachia.com') };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hans"><body>{children}</body></html>;
}
