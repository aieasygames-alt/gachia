'use client';

import { useEffect, useState } from 'react';
import type { SupportedLocale } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';
import { zzzCharacters, getZzzCharacterName } from '@gachia/data/games/zzz/characters';

function t(locale: SupportedLocale, zh: string, en: string, ja: string) {
  return locale === 'zh' ? zh : locale === 'ja' ? ja : en;
}

export function ZzzQueuedWeapons({ locale }: { locale: SupportedLocale }) {
  const [queue, setQueue] = useState<string[]>([]);

  useEffect(() => {
    try { setQueue(JSON.parse(localStorage.getItem('gachia-zzz-progression-queue') ?? '[]')); } catch { /* local storage is optional */ }
  }, []);

  const agents = queue
    .map((id) => zzzCharacters.find((character) => character.id === id))
    .filter((character): character is NonNullable<typeof character> => character !== undefined);

  if (agents.length === 0) return null;

  return <section className="mb-6 border border-game-border bg-game-surface p-4">
    <h2 className="text-sm font-semibold text-game-text">{t(locale, '养成队列的音擎方向', 'W-Engine direction for your progression queue', '育成キューのWエンジン方針')}</h2>
    <p className="mt-1 text-xs leading-5 text-game-text-muted">{t(locale, '根据配装推荐先核对每位代理人的最佳与替代音擎；实际持有与强化顺序仍以你的库存和队伍需求为准。', 'Use build recommendations to check each agent\'s best and alternative W-Engines first; actual ownership and upgrade order still depend on your inventory and team needs.', 'ビルド推奨から各エージェントの最適・代替Wエンジンを確認します。実際の所持状況と強化順は在庫と編成需要を基準にしてください。')}</p>
    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{agents.map((agent) => <div key={agent.id} className="border border-game-border bg-game-surface-alt p-3"><p className="font-medium text-game-text">{getZzzCharacterName(agent, locale)}</p><p className="mt-1 text-xs text-game-text-muted">{locale === 'zh' ? agent.recommendedBuild.bestWeapon : agent.recommendedBuild.bestWeaponEn}</p><Link href="/zzz/build" className="mt-2 inline-block text-xs font-semibold text-game-primary hover:text-game-accent">{t(locale, '查看完整配装 →', 'Open full build →', 'ビルドを見る →')}</Link></div>)}</div>
  </section>;
}
