import { getRequestConfig } from 'next-intl/server';
import { LOCALES, DEFAULT_LOCALE } from '@gachia/core';
import type { SupportedLocale } from '@gachia/core';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !LOCALES.includes(locale as SupportedLocale)) {
    locale = DEFAULT_LOCALE;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
