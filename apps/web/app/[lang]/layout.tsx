import { notFound } from 'next/navigation';
import Script from 'next/script';
import { NextIntlClientProvider } from 'next-intl';
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
    <html lang={locale === 'zh' ? 'zh-Hans' : locale}>
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-4L1VKXGY2Y"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-4L1VKXGY2Y');
          `}
        </Script>
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8569630257520732"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
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
