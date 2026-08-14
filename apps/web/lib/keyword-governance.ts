export type KeywordRiskCategory =
  | 'adult'
  | 'derivative'
  | 'leak'
  | 'mod'
  | 'datamine'
  | 'privateServer'
  | 'unofficialDownload'
  | 'offTopic';

export interface KeywordRiskRule {
  term: string;
  category: KeywordRiskCategory;
  reason: string;
}

export const KEYWORD_RISK_RULES: KeywordRiskRule[] = [
  { term: '18+', category: 'adult', reason: 'Adult intent is outside Gachia content scope.' },
  { term: '18禁', category: 'adult', reason: 'Adult intent is outside Gachia content scope.' },
  { term: 'r18', category: 'adult', reason: 'Adult intent is outside Gachia content scope.' },
  { term: 'nsfw', category: 'adult', reason: 'Adult intent is outside Gachia content scope.' },
  { term: 'adult', category: 'adult', reason: 'Adult intent is outside Gachia content scope.' },
  { term: 'porn', category: 'adult', reason: 'Adult intent is outside Gachia content scope.' },
  { term: 'hentai', category: 'adult', reason: 'Adult intent is outside Gachia content scope.' },
  { term: 'nude', category: 'adult', reason: 'Adult intent is outside Gachia content scope.' },
  { term: '成人', category: 'adult', reason: 'Adult intent is outside Gachia content scope.' },
  { term: '裸', category: 'adult', reason: 'Adult intent is outside Gachia content scope.' },
  { term: '涩图', category: 'adult', reason: 'Adult image intent is outside Gachia content scope.' },
  { term: '色图', category: 'adult', reason: 'Adult image intent is outside Gachia content scope.' },
  { term: '同人', category: 'derivative', reason: 'Derivative fan content is not a target content lane.' },
  { term: '本子', category: 'derivative', reason: 'Derivative fan content is not a target content lane.' },
  { term: 'vicineko', category: 'derivative', reason: 'Known derivative/adult creator intent is not supported.' },
  { term: 'akt', category: 'derivative', reason: 'Known derivative/adult creator intent is not supported.' },
  { term: '内鬼', category: 'leak', reason: 'Leak intent should not be amplified.' },
  { term: '爆料', category: 'leak', reason: 'Unverified leak intent should not be amplified.' },
  { term: 'leak', category: 'leak', reason: 'Leak intent should not be amplified.' },
  { term: 'leaks', category: 'leak', reason: 'Leak intent should not be amplified.' },
  { term: 'mod', category: 'mod', reason: 'Mod intent is outside official guide scope.' },
  { term: 'mods', category: 'mod', reason: 'Mod intent is outside official guide scope.' },
  { term: '解包', category: 'datamine', reason: 'Datamine intent should not be amplified.' },
  { term: 'datamine', category: 'datamine', reason: 'Datamine intent should not be amplified.' },
  { term: 'aes key', category: 'datamine', reason: 'Datamine/decryption intent should not be amplified.' },
  { term: '公益服', category: 'privateServer', reason: 'Private-server intent is unsafe and unofficial.' },
  { term: '私服', category: 'privateServer', reason: 'Private-server intent is unsafe and unofficial.' },
  { term: 'apk', category: 'unofficialDownload', reason: 'APK download intent requires manual official-source review.' },
  { term: '破解版', category: 'unofficialDownload', reason: 'Pirated download intent is unsafe and unsupported.' },
  { term: '无限大符号', category: 'offTopic', reason: 'Math-symbol intent is unrelated to Ananta game content.' },
  { term: 'ashfall nebraska', category: 'offTopic', reason: 'Place-name intent is unrelated to Ashfall Evolution game content.' },
];

export function getKeywordRisk(query: string): KeywordRiskRule | undefined {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return undefined;

  return KEYWORD_RISK_RULES.find((rule) =>
    normalized.includes(rule.term.toLowerCase()),
  );
}

export function isBlockedNoiseQuery(query: string): boolean {
  return getKeywordRisk(query) !== undefined;
}
