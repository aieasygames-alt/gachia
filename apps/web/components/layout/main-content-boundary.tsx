'use client';

import type { ReactNode } from 'react';

// Preserve children without a DOM wrapper. This does not bound hydration retries.
export function MainContentBoundary({ children }: { children?: ReactNode }) {
  return children;
}
