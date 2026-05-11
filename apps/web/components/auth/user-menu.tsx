'use client';

import { useState } from 'react';
import { useSession, signOut } from '@/lib/auth-client';

export function UserMenu() {
  const { data: session, isPending } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    setMenuOpen(false);
  }

  if (isPending) {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-game-surface-alt" />;
  }

  if (!session) {
    return null; // AuthDialog is controlled by parent
  }

  const user = session.user;

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-game-border bg-game-surface transition-colors hover:border-game-primary"
      >
        {user.image ? (
          <img src={user.image} alt={user.name || ''} className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-medium text-game-text">
            {(user.name || user.email)[0]?.toUpperCase()}
          </span>
        )}
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-game-border bg-game-surface py-1 shadow-lg">
            <div className="border-b border-game-border px-3 py-2">
              <p className="text-sm font-medium text-game-text">{user.name}</p>
              <p className="text-xs text-game-text-muted">{user.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full px-3 py-2 text-left text-sm text-game-text-muted transition-colors hover:bg-game-surface-alt hover:text-game-text"
            >
              退出登录
            </button>
          </div>
        </>
      )}
    </div>
  );
}
