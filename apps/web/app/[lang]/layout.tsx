import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { GoogleAnalytics } from '@next/third-parties/google';
import { LOCALES, DEFAULT_LOCALE } from '@gachia/core';
import type { SupportedLocale } from '@gachia/core';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';

import zhMessages from '@/messages/zh.json';
import enMessages from '@/messages/en.json';
import jaMessages from '@/messages/ja.json';

const allMessages: Record<string, Record<string, unknown>> = {
  zh: zhMessages,
  en: enMessages,
  ja: jaMessages,
};

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ lang: locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!LOCALES.includes(lang as SupportedLocale)) {
    notFound();
  }

  const locale = lang as SupportedLocale;
  const messages = allMessages[locale] ?? allMessages[DEFAULT_LOCALE];

  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <GoogleAnalytics gaId="G-4L1VKXGY2Y" />
      </head>
      <body className="min-h-screen bg-game-bg text-game-text antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div className="flex min-h-screen flex-col">
            <SiteHeader locale={locale} />
            <main className="flex-1">{children}</main>
            <SiteFooter locale={locale} />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
