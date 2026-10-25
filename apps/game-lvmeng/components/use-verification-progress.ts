'use client';

import { useEffect, useState } from 'react';
import { parseVerificationProgress } from '../lib/verification-progress';

export function useVerificationProgress(storageKey: string) {
  const [complete, setComplete] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  useEffect(() => {
    try { setComplete(parseVerificationProgress(window.localStorage.getItem(storageKey))); }
    catch { setStorageUnavailable(true); }
    finally { setHydrated(true); }
  }, [storageKey]);
  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(storageKey, JSON.stringify(complete)); }
    catch { setStorageUnavailable(true); }
  }, [complete, hydrated, storageKey]);
  return { complete, setComplete, storageUnavailable };
}
