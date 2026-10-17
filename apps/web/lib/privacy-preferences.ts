export const PRIVACY_KEY = 'gachia.privacy.v1';
export type PrivacyChoice = 'accepted' | 'rejected';

export function readPrivacyChoice(storage: Pick<Storage, 'getItem'>): PrivacyChoice | null {
  try {
    const value = storage.getItem(PRIVACY_KEY);
    return value === 'accepted' || value === 'rejected' ? value : null;
  } catch { return null; }
}

export function savePrivacyChoice(storage: Pick<Storage, 'setItem' | 'getItem'>, choice: PrivacyChoice): boolean {
  try {
    storage.setItem(PRIVACY_KEY, choice);
    return storage.getItem(PRIVACY_KEY) === choice;
  } catch { return false; }
}

export function allowAnalytics(mode: string | undefined, origin: string, choice: PrivacyChoice | null): boolean {
  return mode === 'production' && origin === 'https://gachia.com' && choice === 'accepted';
}
