import { notFound } from 'next/navigation';
import type { SupportedLocale } from '@gachia/core';
import { PreviewSiteShell } from '@/components/site-shell';

const locales = new Set<SupportedLocale>(['zh', 'en', 'ja']);

export default async function NteLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ lang: string }> }>) {
  const { lang } = await params;
  if (!locales.has(lang as SupportedLocale)) notFound();
  return <PreviewSiteShell locale={lang as SupportedLocale}>{children}</PreviewSiteShell>;
}
