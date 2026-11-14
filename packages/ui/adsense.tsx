'use client';

import { useEffect, useState } from 'react';

export const ADS_CHOICE_KEY = 'gachia.ads.v1';
export const ADS_CLIENT = 'ca-pub-8569630257520732';
type Choice = 'accepted' | 'rejected';

const COPY = {
  zh: { title: '广告偏好', body: '允许后将加载 Google AdSense 广告，Google 可能使用 Cookie 或类似技术。拒绝不影响阅读和工具。可随时在此更改；更改会重新加载页面。', allow: '允许广告', reject: '不允许广告', privacy: '隐私政策', failure: '无法保存偏好，广告保持关闭。' },
  en: { title: 'Ad preferences', body: 'Allow Google AdSense ads. Google may use cookies or similar technologies. Declining does not affect reading or tools. You can change this here at any time; changes reload the page.', allow: 'Allow ads', reject: 'Decline ads', privacy: 'Privacy policy', failure: 'Could not save preferences. Ads remain off.' },
  ja: { title: '広告設定', body: '許可すると Google AdSense の広告を読み込みます。Google は Cookie 等を使用する場合があります。拒否しても閲覧やツールに影響はありません。ここでいつでも変更でき、変更時は再読み込みします。', allow: '広告を許可', reject: '広告を拒否', privacy: 'プライバシーポリシー', failure: '設定を保存できません。広告は無効のままです。' },
};

export function allowAds(mode: string | undefined, origin: string, choice: Choice | null) {
  return mode === 'production' && origin === 'https://gachia.com' && choice === 'accepted';
}

// Separate consent: an earlier choice to enable Analytics never enables ads.
export function AdsensePreferences() {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [locale, setLocale] = useState<'zh' | 'en' | 'ja'>('en');

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || window.location.origin !== 'https://gachia.com') return;
    const lang = window.location.pathname.split('/')[1];
    setLocale(lang === 'zh' || lang === 'ja' ? lang : 'en');
    let choice: Choice | null = null;
    try {
      const value = window.localStorage.getItem(ADS_CHOICE_KEY);
      if (value === 'accepted' || value === 'rejected') {
        window.localStorage.setItem(ADS_CHOICE_KEY, value);
        if (window.localStorage.getItem(ADS_CHOICE_KEY) === value) choice = value;
      }
    } catch { /* Unavailable or unwritable storage keeps ads off. */ }
    if (new URL(window.location.href).searchParams.get('ads') === 'off') choice = null;
    if (allowAds(process.env.NODE_ENV, window.location.origin, choice) && !document.getElementById('google-adsense')) {
      const script = document.createElement('script');
      script.id = 'google-adsense';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS_CLIENT}`;
      document.head.appendChild(script);
    }
    setReady(true);
    setOpen(choice === null);
    const changed = (event: StorageEvent) => {
      if (event.key === ADS_CHOICE_KEY || event.key === null) window.location.reload();
    };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, []);

  function choose(choice: Choice) {
    let saved = false;
    try {
      window.localStorage.setItem(ADS_CHOICE_KEY, choice);
      saved = window.localStorage.getItem(ADS_CHOICE_KEY) === choice;
    } catch { /* A running SDK must be revoked by reloading, not unmounting. */ }
    const url = new URL(window.location.href);
    if (saved) url.searchParams.delete('ads');
    else url.searchParams.set('ads', 'off');
    if (saved || document.getElementById('google-adsense')) window.location.replace(url.href);
    else setFailed(true);
  }

  if (!ready) return null;
  const copy = COPY[locale];
  const buttonStyle = { border: '1px solid #64748b', borderRadius: 6, padding: '6px 10px', color: 'inherit', background: '#1e293b', cursor: 'pointer', font: 'inherit' };
  return <aside aria-label={copy.title} data-gachia-ads-preferences style={{ position: 'fixed', right: 12, bottom: 12, zIndex: 81, maxWidth: 'min(360px, calc(100vw - 24px))', border: '1px solid #64748b', borderRadius: 10, padding: 12, color: '#f1f5f9', background: '#0f172a', fontSize: 13, lineHeight: 1.5, boxShadow: '0 4px 20px #0005' }}>
    <button type="button" aria-expanded={open} aria-controls="ads-preferences-panel" onClick={() => setOpen(!open)} style={{ ...buttonStyle, border: 0, padding: 0, textDecoration: 'underline' }}>{copy.title}</button>
    {open && <div id="ads-preferences-panel">
      <p style={{ margin: '8px 0' }}>{copy.body}</p>
      <a href={`/${locale}/privacy`} style={{ color: 'inherit', textDecoration: 'underline' }}>{copy.privacy}</a>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        <button type="button" onClick={() => choose('rejected')} style={buttonStyle}>{copy.reject}</button>
        <button type="button" onClick={() => choose('accepted')} style={buttonStyle}>{copy.allow}</button>
      </div>
      {failed && <p role="alert">{copy.failure}</p>}
    </div>}
  </aside>;
}
