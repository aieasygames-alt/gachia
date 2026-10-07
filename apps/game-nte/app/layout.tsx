import type { Metadata } from 'next';
import './globals.css';

const isPreview = process.env.NTE_DEPLOYMENT_MODE !== 'live';

export const metadata: Metadata = {
  metadataBase: new URL('https://gachia.com'),
  robots: isPreview ? { index: false, follow: false } : undefined,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
