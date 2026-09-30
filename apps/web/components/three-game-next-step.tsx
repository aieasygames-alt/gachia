'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { THREE_GAME_STATUS_CARDS } from '@/lib/three-game-status';

export function ThreeGameNextStep() {
  const [selectedId, setSelectedId] = useState(THREE_GAME_STATUS_CARDS[0]!.id);
  const selected = THREE_GAME_STATUS_CARDS.find((item) => item.id === selectedId) ?? THREE_GAME_STATUS_CARDS[0]!;
  const stage = selected.status === 'live' ? '已上线' : selected.status === 'test' ? '测试中' : '待开服';
  const prompt = selected.status === 'live'
    ? '先确认官方客户端与账号，再进入首日路线和系统资料。'
    : selected.status === 'test'
      ? '先确认来源状态与测试版本，再记录可复现的系统反馈。'
      : '先确认官方入口、账号与开服信息，再等待客户端核验首日内容。';

  return <section className="rounded-lg border border-game-border bg-game-surface p-5 md:p-6">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-game-primary">下一步选择器</p>
        <h2 className="mt-1 text-xl font-bold text-game-text">我现在该从哪里开始？</h2>
      </div>
      <span className="text-xs text-game-text-muted">按当前内容阶段分流</span>
    </div>
    <div className="mt-5 grid gap-3 md:grid-cols-3" role="radiogroup" aria-label="选择游戏">
      {THREE_GAME_STATUS_CARDS.map((item) => {
        const active = item.id === selected.id;
        const label = item.status === 'live' ? '已上线' : item.status === 'test' ? '测试中' : '待开服';
        return <button key={item.id} type="button" role="radio" aria-checked={active} onClick={() => setSelectedId(item.id)} className={`min-h-24 border p-4 text-left transition-colors ${active ? 'border-game-primary bg-game-primary/10' : 'border-game-border bg-game-surface-alt hover:border-game-primary/60'}`}>
          <span className="block text-xs font-semibold text-game-primary">{label}</span>
          <span className="mt-1 block text-sm font-semibold text-game-text">{item.title}</span>
        </button>;
      })}
    </div>
    <div className="mt-4 grid gap-4 rounded-lg border border-game-border bg-game-surface-alt p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <div>
        <p className="text-xs font-semibold text-game-primary">{stage}</p>
        <h3 className="mt-1 text-lg font-semibold text-game-text">{selected.action}</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-game-text-muted">{prompt} {selected.summary}</p>
      </div>
      <a href={selected.href} className="inline-flex items-center justify-center gap-2 rounded-md bg-game-primary px-4 py-3 text-sm font-semibold text-game-bg transition-opacity hover:opacity-90">
        打开行动页 <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </a>
    </div>
  </section>;
}
