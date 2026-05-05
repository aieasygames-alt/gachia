import { getRequestConfig } from 'next-intl/server';
import { LOCALES, DEFAULT_LOCALE } from '@gachia/core';
import type { SupportedLocale } from '@gachia/core';

import zhMessages from '../../messages/zh.json';
import enMessages from '../../messages/en.json';
import jaMessages from '../../messages/ja.json';

const allMessages: Record<string, Record<string, unknown>> = {
  zh: zhMessages,
  en: enMessages,
  ja: jaMessages,
};

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !LOCALES.includes(locale as SupportedLocale)) {
    locale = DEFAULT_LOCALE;
  }

  return {
    locale,
    messages: allMessages[locale] ?? allMessages[DEFAULT_LOCALE],
  };
});
