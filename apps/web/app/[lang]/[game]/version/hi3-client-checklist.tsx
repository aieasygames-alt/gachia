'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SupportedLocale } from '@gachia/core';

type ChecklistCopy = {
  title: string;
  description: string;
  reset: string;
  copy: string;
  copied: string;
  lastChecked: (value: string) => string;
  notChecked: string;
  progress: (complete: number, total: number) => string;
  items: string[];
};

const COPY: Record<SupportedLocale, ChecklistCopy> = {
  zh: {
    title: '客户端核对清单',
    description: '仅记录你已在游戏内亲自确认的状态；本页不会把历史公告视为当前可领取内容。',
    reset: '重置本地勾选',
    copy: '复制核对摘要',
    copied: '已复制',
    lastChecked: (value) => `上次本地记录：${value}`,
    notChecked: '尚未完成本地核对记录',
    progress: (complete, total) => `已完成 ${complete}/${total}`,
    items: ['已确认当前服务器与版本号', '已确认活动和补给结束时间', '已记录水晶、补给卡与保底状态', '已确认现有队伍与装备缺口', '已在客户端确认材料、锻造或回归资格'],
  },
  en: {
    title: 'Client verification checklist',
    description: 'Record only status you personally verified in-game; this page never treats a historical notice as a live claim.',
    reset: 'Reset local checks',
    copy: 'Copy verification summary',
    copied: 'Copied',
    lastChecked: (value) => `Last local record: ${value}`,
    notChecked: 'No local verification recorded yet',
    progress: (complete, total) => `${complete}/${total} complete`,
    items: ['Confirmed current server and version', 'Confirmed event and supply end times', 'Recorded Crystals, Supply Cards, and pity status', 'Confirmed roster and gear gaps', 'Verified materials, crafting, or returnee eligibility in the client'],
  },
  ja: {
    title: 'クライアント確認チェック',
    description: 'ゲーム内で自分で確認した状態だけを記録します。過去の告知を現在受取可能として扱いません。',
    reset: 'ローカル確認をリセット',
    copy: '確認概要をコピー',
    copied: 'コピー済み',
    lastChecked: (value) => `最終ローカル記録：${value}`,
    notChecked: 'ローカル確認記録はまだありません',
    progress: (complete, total) => `${complete}/${total} 完了`,
    items: ['現在のサーバーとバージョンを確認', 'イベント・補給終了時刻を確認', '水晶、補給カード、天井状態を記録', '所持編成と装備不足を確認', '素材、鍛造、復帰資格をクライアントで確認'],
  },
};

const STORAGE_KEY = 'gachia-hi3-v9-client-checklist';
const UPDATED_AT_KEY = 'gachia-hi3-v9-client-checklist-updated-at';

export function Hi3ClientChecklist({ locale }: { locale: SupportedLocale }) {
  const copy = COPY[locale];
  const [checked, setChecked] = useState<boolean[]>(() => copy.items.map(() => false));
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      if (Array.isArray(saved)) setChecked(copy.items.map((_, index) => saved[index] === true));
      const savedTime = localStorage.getItem(UPDATED_AT_KEY);
      setUpdatedAt(savedTime && Number.isFinite(Date.parse(savedTime)) ? savedTime : null);
    } catch {
      // Local persistence is optional.
    }
    setLoaded(true);
  }, [copy.items]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
    } catch {
      // Local persistence is optional.
    }
  }, [checked, loaded]);

  const complete = useMemo(() => checked.filter(Boolean).length, [checked]);
  const lastChecked = updatedAt ? new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(updatedAt)) : null;

  async function copySummary() {
    const summary = `${copy.title}\n${copy.progress(complete, copy.items.length)}\n${copy.items.map((item, index) => `${checked[index] ? '[x]' : '[ ]'} ${item}`).join('\n')}`;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access may be unavailable.
    }
  }

  function updateChecked(next: boolean[]) {
    const now = new Date().toISOString();
    setChecked(next);
    setUpdatedAt(now);
    try {
      localStorage.setItem(UPDATED_AT_KEY, now);
    } catch {
      // Local persistence is optional.
    }
  }

  return (
    <section className="mt-10 rounded-lg border border-game-border bg-game-surface p-5" aria-labelledby="hi3-client-checklist">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="hi3-client-checklist" className="font-semibold text-game-text">{copy.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-game-text-muted">{copy.description}</p>
        </div>
        <span className="rounded bg-game-primary/15 px-2 py-1 text-sm font-medium text-game-primary">{copy.progress(complete, copy.items.length)}</span>
      </div>
      <div className="mt-4 grid gap-2">
        {copy.items.map((item, index) => (
          <label key={item} className="flex cursor-pointer items-start gap-3 rounded border border-game-border px-3 py-3 text-sm text-game-text hover:border-game-primary">
            <input
              type="checkbox"
              checked={checked[index] ?? false}
              onChange={() => updateChecked(checked.map((value, itemIndex) => itemIndex === index ? !value : value))}
              className="mt-0.5 h-4 w-4 accent-[var(--game-primary)]"
            />
            <span>{item}</span>
          </label>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
        <span className="text-game-text-muted">{lastChecked ? copy.lastChecked(lastChecked) : copy.notChecked}</span>
        {complete > 0 && <button type="button" onClick={copySummary} className="font-medium text-game-primary hover:text-game-accent">{copied ? copy.copied : copy.copy}</button>}
        {complete > 0 && <button type="button" onClick={() => updateChecked(copy.items.map(() => false))} className="font-medium text-game-primary hover:text-game-accent">{copy.reset}</button>}
      </div>
    </section>
  );
}
