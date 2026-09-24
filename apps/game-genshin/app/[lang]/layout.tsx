import { notFound } from 'next/navigation';
import type { SupportedLocale } from '@gachia/core';
import { LOCALES } from '@/lib/i18n';

const htmlLanguages: Record<SupportedLocale, string> = { zh: 'zh-Hans', en: 'en', ja: 'ja' };

export default async function LocaleLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ lang: string }> }>) {
  const { lang } = await params;
  if (!LOCALES.includes(lang as SupportedLocale)) notFound();
  return <div lang={htmlLanguages[lang as SupportedLocale]}>{children}</div>;
}
