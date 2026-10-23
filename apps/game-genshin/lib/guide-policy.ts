import type { SupportedLocale } from '@gachia/core';
import type { GenshinGuide } from '@gachia/data/games/genshin/guides';

const LOCALES: SupportedLocale[] = ['zh', 'en', 'ja'];

export function isGuideLocaleIndexable(guide: GenshinGuide, locale: SupportedLocale): boolean {
  const [title, summary, content] = locale === 'zh'
    ? [guide.title, guide.summary, guide.content]
    : locale === 'en' ? [guide.titleEn, guide.summaryEn, guide.contentEn]
      : [guide.titleJa, guide.summaryJa, guide.contentJa];
  return Boolean(title?.trim() && summary?.trim() && content && content.trim().length >= 80);
}

export function guideReadingLocale(guide: GenshinGuide, locale: SupportedLocale): SupportedLocale {
  if (isGuideLocaleIndexable(guide, locale)) return locale;
  if (isGuideLocaleIndexable(guide, 'en')) return 'en';
  return LOCALES.find(candidate => isGuideLocaleIndexable(guide, candidate)) ?? 'zh';
}

export function guideAlternates(guide: GenshinGuide, locale: SupportedLocale) {
  const url = (language: SupportedLocale) => `https://gachia.com/${language}/genshin/guides/${guide.id}`;
  const languages: Record<string, string> = {};
  for (const language of LOCALES) {
    if (isGuideLocaleIndexable(guide, language)) languages[language === 'zh' ? 'zh-Hans' : language] = url(language);
  }
  const defaultLocale = LOCALES.find(language => isGuideLocaleIndexable(guide, language));
  if (defaultLocale) languages['x-default'] = url(defaultLocale);
  return { canonical: url(locale), languages };
}

export function guideFaq(guide: GenshinGuide, locale: SupportedLocale) {
  return (guide.faq ?? []).flatMap(entry => {
    const question = locale === 'zh' ? entry.questionZh : locale === 'ja' ? entry.questionJa : entry.question;
    const answer = locale === 'zh' ? entry.answerZh : locale === 'ja' ? entry.answerJa : entry.answer;
    return question?.trim() && answer?.trim() ? [{ question, answer }] : [];
  });
}
