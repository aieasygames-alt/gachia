import type { SupportedLocale } from '@gachia/core';

export type NteGuide = {
  id: string;
  title?: string | null; titleEn?: string | null; titleJa?: string | null;
  summary?: string | null; summaryEn?: string | null; summaryJa?: string | null;
  content?: string | null; contentEn?: string | null; contentJa?: string | null;
  date?: string;
  faq?: Array<{ question?: string; questionZh?: string; questionJa?: string; answer?: string; answerZh?: string; answerJa?: string }>;
};
const locales: SupportedLocale[] = ['zh', 'en', 'ja'];
const text = (value: unknown) => typeof value === 'string' ? value : '';

export function nteGuideText(guide: NteGuide, locale: SupportedLocale) {
  return locale === 'zh' ? { title: text(guide.title), summary: text(guide.summary), content: text(guide.content) }
    : locale === 'en' ? { title: text(guide.titleEn), summary: text(guide.summaryEn), content: text(guide.contentEn) }
      : { title: text(guide.titleJa), summary: text(guide.summaryJa), content: text(guide.contentJa) };
}

export function isNteGuideLocaleIndexable(guide: NteGuide, locale: SupportedLocale) {
  const { title, summary, content } = nteGuideText(guide, locale);
  if (locale === 'ja') {
    const japanese = (value: string, minimum: number) => Array.from(value.trim()).length >= minimum && /[\u3040-\u30ff]/.test(value);
    return japanese(title, 8) && japanese(summary, 40) && japanese(content, 200);
  }
  return Boolean(title.trim() && summary.trim() && content.trim().length >= 80);
}

export function nteGuideReadingLocale(guide: NteGuide, requested: SupportedLocale): SupportedLocale {
  if (isNteGuideLocaleIndexable(guide, requested)) return requested;
  if (isNteGuideLocaleIndexable(guide, 'en')) return 'en';
  const qualified = locales.find(locale => isNteGuideLocaleIndexable(guide, locale));
  if (qualified) return qualified;
  return ([requested, 'en', 'zh', 'ja'] as SupportedLocale[]).find(locale => {
    const fields = nteGuideText(guide, locale);
    return fields.title.trim() && fields.content.trim();
  }) ?? 'zh';
}

export function nteGuideReading(guide: NteGuide, requested: SupportedLocale) {
  const locale = nteGuideReadingLocale(guide, requested);
  return { ...nteGuideText(guide, locale), locale, lang: locale === 'zh' ? 'zh-Hans' : locale, fallback: locale !== requested };
}

export function nteGuideAlternates(guide: NteGuide, requested: SupportedLocale) {
  const url = (locale: SupportedLocale) => `https://gachia.com/${locale}/nte/guides/${guide.id}`;
  const languages: Record<string, string> = {};
  for (const locale of locales) if (isNteGuideLocaleIndexable(guide, locale)) languages[locale === 'zh' ? 'zh-Hans' : locale] = url(locale);
  const primary = locales.find(locale => isNteGuideLocaleIndexable(guide, locale));
  if (primary) languages['x-default'] = url(primary);
  return { canonical: url(requested), languages };
}

export function nteGuideFaq(guide: NteGuide, locale: SupportedLocale) {
  return (guide.faq ?? []).flatMap(entry => {
    const question = locale === 'zh' ? entry.questionZh : locale === 'ja' ? entry.questionJa : entry.question;
    const answer = locale === 'zh' ? entry.answerZh : locale === 'ja' ? entry.answerJa : entry.answer;
    return question?.trim() && answer?.trim() ? [{ question, answer }] : [];
  });
}
