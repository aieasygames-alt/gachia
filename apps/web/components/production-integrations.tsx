'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { allowProductionIntegrations } from '@/lib/production-integrations';
import { allowAnalytics, PRIVACY_KEY, readPrivacyChoice, savePrivacyChoice } from '@/lib/privacy-preferences';

const COPY = {
  zh: { title: '隐私偏好', body: '可选择启用 Google Analytics 访问分析。拒绝不影响阅读或 Google 登录。广告与 Clarity 会话回放暂不启用。更改选择会重新加载页面；已发送的数据不会被撤回。', accept: '允许访问分析', reject: '拒绝非必要服务', link: '隐私政策', failure: '无法保存偏好，非必要服务保持关闭。', close: '收起' },
  en: { title: 'Privacy preferences', body: 'You can enable Google Analytics. Rejecting does not affect reading or Google sign-in. Ads and Clarity session replay remain disabled. Changes reload the page; data already sent cannot be recalled.', accept: 'Allow analytics', reject: 'Reject optional services', link: 'Privacy policy', failure: 'Preferences could not be saved. Optional services stay off.', close: 'Close' },
  ja: { title: 'プライバシー設定', body: 'Google Analyticsの利用を選択できます。拒否しても閲覧とGoogleログインは利用可能です。広告とClarityのセッション再生は無効です。変更時に再読み込みします。送信済みデータは取り消せません。', accept: 'アクセス分析を許可', reject: '任意サービスを拒否', link: 'プライバシーポリシー', failure: '設定を保存できません。任意サービスは無効のままです。', close: '閉じる' },
};

export function ProductionIntegrations() {
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [failure, setFailure] = useState(false);
  const [locale, setLocale] = useState<'zh' | 'en' | 'ja'>('en');
  useEffect(() => {
    if (!allowProductionIntegrations(process.env.NODE_ENV, window.location.origin)) return;
    const lang = window.location.pathname.split('/')[1];
    setLocale(lang === 'zh' || lang === 'ja' ? lang : 'en');
    let choice = null;
    try {
      choice = readPrivacyChoice(window.localStorage);
      // A readable but unwritable store must not revive a previously accepted choice.
      if (choice && !savePrivacyChoice(window.localStorage, choice)) choice = null;
    } catch { /* Storage can be blocked by the browser. */ }
    if (new URL(window.location.href).searchParams.get('privacy') === 'off') choice = null;
    setEnabled(allowAnalytics(process.env.NODE_ENV, window.location.origin, choice));
    setAvailable(true);
    setOpen(choice === null);
    const changed = (event: StorageEvent) => {
      if (event.key === PRIVACY_KEY || event.key === null) window.location.reload();
    };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, []);

  function choose(choice: 'accepted' | 'rejected') {
    let saved = false;
    try { saved = savePrivacyChoice(window.localStorage, choice); } catch { /* Fail closed. */ }
    // Unmounting next/script does not stop an already running analytics SDK.
    if (saved) {
      const url = new URL(window.location.href);
      url.searchParams.delete('privacy');
      window.location.replace(url.href);
    } else if (enabled) {
      const url = new URL(window.location.href);
      url.searchParams.set('privacy', 'off');
      window.location.replace(url.href);
    }
    else { setEnabled(false); setFailure(true); }
  }

  if (!available) return null;
  const copy = COPY[locale];
  return <>
    {enabled && <>
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-4L1VKXGY2Y" strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-4L1VKXGY2Y');
      `}</Script>
    </>}
    <aside aria-label={copy.title} className="fixed bottom-4 left-4 z-[80] max-w-[calc(100vw-2rem)] rounded-xl border border-game-border bg-game-surface p-4 text-game-text shadow-xl sm:max-w-md">
      <button type="button" aria-expanded={open} aria-controls="privacy-preferences-panel" onClick={() => setOpen(!open)} className="text-sm font-semibold underline underline-offset-4">{copy.title}</button>
      {open && <div id="privacy-preferences-panel">
        <p className="my-3 text-sm text-game-text-muted">{copy.body}</p>
        <a href={`/${locale}/privacy`} className="text-sm underline">{copy.link}</a>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => choose('rejected')} className="rounded border border-game-border px-3 py-2 text-sm">{copy.reject}</button>
          <button type="button" onClick={() => choose('accepted')} className="rounded border border-game-border px-3 py-2 text-sm">{copy.accept}</button>
          <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-sm underline">{copy.close}</button>
        </div>
        {failure && <p role="alert" className="mt-3 text-sm">{copy.failure}</p>}
      </div>}
    </aside>
  </>;
}
