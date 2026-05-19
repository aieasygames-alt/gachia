'use client';

import { useEffect } from 'react';
import { Link } from '@/lib/i18n/navigation';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <AlertTriangle className="h-16 w-16 text-game-accent" />
      <h1 className="text-2xl font-semibold text-game-text">
        Something went wrong
      </h1>
      <p className="max-w-md text-game-text-muted">
        An unexpected error occurred. Please try again.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg border border-game-border bg-game-surface px-6 py-3 text-sm font-medium text-game-text transition-colors hover:border-game-primary"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-game-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-game-accent"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
