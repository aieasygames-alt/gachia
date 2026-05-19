'use client';

import { Link } from '@/lib/i18n/navigation';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="text-6xl font-bold text-game-primary">404</div>
      <h1 className="text-2xl font-semibold text-game-text">
        Page Not Found
      </h1>
      <p className="max-w-md text-game-text-muted">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-lg bg-game-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-game-accent"
      >
        <Home className="h-4 w-4" />
        Back to Home
      </Link>
    </div>
  );
}
