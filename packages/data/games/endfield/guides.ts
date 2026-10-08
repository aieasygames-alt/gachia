import type { SupportedLocale } from '@gachia/core';
import { join } from 'node:path';
import { loadJson } from '../../load-json';
import { localeStr } from './types';
const rawGuides = await loadJson<unknown>(join(process.cwd(), '../../packages/data/games/endfield/raw-guides.json'), '/data/endfield/raw-guides.json');

export interface EndfieldGuideFaq {
  question: string;
  questionZh: string;
  questionJa?: string;
  answer: string;
  answerZh: string;
  answerJa?: string;
}

export interface EndfieldGuide {
  id: string;
  title: string;
  titleEn: string;
  titleJa?: string;
  category: string;
  categoryZh: string;
  categoryEn: string;
  categoryJa?: string;
  summary: string;
  summaryEn: string;
  summaryJa?: string;
  content: string;
  contentEn: string;
  contentJa?: string;
  tags: string[];
  faq: EndfieldGuideFaq[];
  updatedAt?: string;
  currentVersion?: string;
  serpTitle?: Partial<Record<SupportedLocale, string>>;
  serpDescription?: Partial<Record<SupportedLocale, string>>;
  quickFacts?: Partial<Record<SupportedLocale, string[]>>;
}

export const endfieldGuides: EndfieldGuide[] = rawGuides as unknown as EndfieldGuide[];

const PIONEER_TEST_ARCHIVE_GUIDE_IDS = new Set([
  'combat-system-guide',
  'base-building-guide',
  'gacha-headhunting-guide',
  'best-operators-tier-list',
  'crisis-contract-guide',
]);

const PIONEER_TEST_ARCHIVE_PREFIX: Record<SupportedLocale, string> = {
  zh: '## Pioneer Test 历史资料提示\n\n本页保留 Pioneer Test 的玩法、队伍或系统记录，仅用于复盘和理解已测试过的设计。测试已结束，具体数值、规则、角色、奖励、活动开放与抽卡机制都不是当前版本结论；下一轮测试或正式版请只以官方公告、游戏内说明和官方商店页面为准。\n\n当前请先看 [/endfield/events](/endfield/events) 的状态板和 [/endfield/guides/pioneer-test-post-test-route](/endfield/guides/pioneer-test-post-test-route) 的测试后路线。\n\n',
  en: '## Pioneer Test archive notice\n\nThis page preserves Pioneer Test gameplay, team, or system notes for recap and for understanding designs that were tested. The test has ended: values, rules, operators, rewards, event availability, and gacha mechanics are not current-version conclusions. For another test or release, rely only on official announcements, in-game notices, and official store pages.\n\nStart with the [/endfield/events](/endfield/events) status board and the [/endfield/guides/pioneer-test-post-test-route](/endfield/guides/pioneer-test-post-test-route) post-test route.\n\n',
  ja: '## Pioneer Testの履歴資料について\n\n本ページは、Pioneer Testで確認されたゲームプレイ、編成、システムの記録を振り返り用に残しています。テストは終了しており、数値、ルール、オペレーター、報酬、イベントの開催状況、ガチャ仕様は現行版の結論ではありません。次回テスト・正式版では、公式告知、ゲーム内案内、公式ストアページのみを基準にしてください。\n\nまず [/endfield/events](/endfield/events) の状態ボードと [/endfield/guides/pioneer-test-post-test-route](/endfield/guides/pioneer-test-post-test-route) のテスト後ルートを確認してください。\n\n',
};

export function getEndfieldGuideTitle(guide: EndfieldGuide, locale: SupportedLocale): string {
  return localeStr(guide.title, guide.titleEn, locale, guide.titleJa);
}

export function getEndfieldGuideContent(guide: EndfieldGuide, locale: SupportedLocale): string {
  const content = localeStr(guide.content, guide.contentEn, locale, guide.contentJa);
  return PIONEER_TEST_ARCHIVE_GUIDE_IDS.has(guide.id) ? `${PIONEER_TEST_ARCHIVE_PREFIX[locale]}${content}` : content;
}

export function getEndfieldGuideSummary(guide: EndfieldGuide, locale: SupportedLocale): string {
  return localeStr(guide.summary, guide.summaryEn, locale, guide.summaryJa);
}

export function getEndfieldGuideCategory(guide: EndfieldGuide, locale: SupportedLocale): string {
  return localeStr(guide.categoryZh, guide.categoryEn, locale, guide.categoryJa);
}

export function getEndfieldGuideCategories(): string[] {
  return [...new Set(endfieldGuides.map((g) => g.category))];
}

export function getEndfieldGuidesByCategory(category: string): EndfieldGuide[] {
  return endfieldGuides.filter((g) => g.category === category);
}

export function getEndfieldGuideById(id: string): EndfieldGuide | undefined {
  return endfieldGuides.find((g) => g.id === id);
}

export function getEndfieldGuideSlugs(): string[] {
  return endfieldGuides.map((g) => g.id);
}

export function getEndfieldGuideFaqQuestion(faq: EndfieldGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.questionZh, faq.question, locale, faq.questionJa);
}

export function getEndfieldGuideFaqAnswer(faq: EndfieldGuideFaq, locale: SupportedLocale): string {
  return localeStr(faq.answerZh, faq.answer, locale, faq.answerJa);
}

export const ENDFIELD_GUIDE_CATEGORIES: Record<string, Record<SupportedLocale, string>> = {};
for (const g of endfieldGuides) {
  if (!ENDFIELD_GUIDE_CATEGORIES[g.category]) {
    ENDFIELD_GUIDE_CATEGORIES[g.category] = { zh: g.categoryZh, en: g.categoryEn, ja: g.categoryEn };
  }
}
