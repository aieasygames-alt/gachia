'use client';

import { useEffect, useRef, useState, type ComponentType } from 'react';
import type { SupportedLocale } from '@gachia/core';
import { isolateModalBackground, isActiveModal } from '@/lib/modal-background';
import { loadSearchModule } from '@/lib/search-module';

type Props = { locale: SupportedLocale; open: boolean; onClose: () => void };

function LoadingDialog({ locale, failed, retry, onClose, activate }: { locale: SupportedLocale; failed: boolean; retry: () => void; onClose: () => void; activate?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const restore = ref.current ? isolateModalBackground(ref.current) : () => {};
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => { restore(); if (previous?.isConnected) previous.focus(); };
  }, []);
  useEffect(() => {
    if (!activate || !ref.current) return;
    // A covered loading owner must not register its replacement above a newer modal.
    const check = () => { if (ref.current && isActiveModal(ref.current)) activate(); };
    const observer = new MutationObserver(check);
    observer.observe(ref.current.ownerDocument.body, { childList: true, subtree: true });
    check();
    return () => observer.disconnect();
  }, [activate]);
  const message = failed ? (locale === 'zh' ? '搜索模块加载失败，请重试。' : locale === 'ja' ? '検索の読み込みに失敗しました。再試行してください。' : 'Search module failed to load. Please retry.') :
    (locale === 'zh' ? '正在准备搜索…' : locale === 'ja' ? '検索を読み込み中…' : 'Preparing search…');
  return <div ref={ref} role="dialog" aria-modal="true" aria-label={locale === 'zh' ? '准备搜索' : locale === 'ja' ? '検索の準備' : 'Preparing search'}
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onKeyDown={(event) => {
      if (event.nativeEvent.isComposing || !ref.current || !isActiveModal(ref.current)) return;
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'Tab') {
        const buttons = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
        if (document.activeElement === (event.shiftKey ? buttons[0] : buttons.at(-1))) {
          event.preventDefault(); (event.shiftKey ? buttons.at(-1) : buttons[0])?.focus();
        }
      }
    }}><div className="rounded-xl border border-game-border bg-game-surface p-6">
      <p role={failed ? 'alert' : 'status'}>{message}</p>
      <button onClick={onClose} className="mt-4 rounded border border-game-border px-4 py-2">{locale === 'zh' ? '关闭' : locale === 'ja' ? '閉じる' : 'Close'}</button>
      {failed && <button onClick={retry} className="ml-3 rounded border border-game-border px-4 py-2">{locale === 'zh' ? '重试' : locale === 'ja' ? '再試行' : 'Retry'}</button>}
    </div></div>;
}

export function SearchLoader(props: Props) {
  const [Dialog, setDialog] = useState<ComponentType<Props> | null>(null);
  const [ReadyDialog, setReadyDialog] = useState<ComponentType<Props> | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!props.open || Dialog) return;
    let cancelled = false;
    setFailed(false);
    loadSearchModule(() => import('./search-dialog')).then((module) => {
      if (!cancelled) setReadyDialog(() => module.SearchDialog);
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [attempt, props.open, Dialog]);
  if (!props.open) return null;
  if (Dialog) return <Dialog {...props} />;
  return <LoadingDialog locale={props.locale} failed={failed} retry={() => setAttempt((value) => value + 1)} onClose={props.onClose}
    activate={ReadyDialog ? () => setDialog(() => ReadyDialog) : undefined} />;
}
