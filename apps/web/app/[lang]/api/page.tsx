import type { Metadata } from 'next';
import type { SupportedLocale } from '@gachia/core';

const TITLE: Record<string, string> = { zh: 'API 文档', en: 'API Documentation', ja: 'API ドキュメント' };
const DESCRIPTION: Record<string, string> = {
  zh: 'Gachia 公开 API 文档 — 获取游戏角色、武器、材料等数据',
  en: 'Gachia public API documentation — access game character, weapon, and material data',
  ja: 'Gachia パブリック API ドキュメント — ゲームキャラ、武器、素材データにアクセス',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = lang as SupportedLocale;
  return {
    title: TITLE[locale],
    description: DESCRIPTION[locale],
  };
}

export default async function ApiPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = lang as SupportedLocale;

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      intro: { zh: 'Gachia API 目前处于规划阶段，尚未公开。以下是我们计划支持的端点概览。', en: 'The Gachia API is currently in the planning phase and not yet publicly available. Below is an overview of the endpoints we plan to support.', ja: 'Gachia API は現在計画段階であり、まだ公開されていません。以下はサポート予定のエンドポイント概要です。' },
      comingSoon: { zh: '即将推出', en: 'Coming Soon', ja: 'Coming Soon' },
      baseUrl: { zh: '基础 URL', en: 'Base URL', ja: 'ベース URL' },
      endpoints: { zh: 'API 端点', en: 'API Endpoints', ja: 'API エンドポイント' },
      method: { zh: '方法', en: 'Method', ja: 'メソッド' },
      desc: { zh: '描述', en: 'Description', ja: '説明' },
      note: { zh: '所有端点计划返回 JSON 格式数据，支持中文 (zh)、英文 (en)、日文 (ja) 三种语言。', en: 'All endpoints are planned to return JSON data with support for Chinese (zh), English (en), and Japanese (ja).', ja: 'すべてのエンドポイントは JSON 形式でのデータ返却を予定しており、中国語 (zh)、英語 (en)、日本語 (ja) をサポートします。' },
      contact: { zh: '如果你有兴趣提前接入 API，请通过 GitHub 联系我们。', en: 'If you are interested in early API access, please contact us via GitHub.', ja: '早期 API アクセスに興味がある場合は、GitHub からご連絡ください。' },
    };
    return translations[key]?.[locale] ?? translations[key]?.en ?? key;
  };

  const endpoints = [
    { method: 'GET', path: '/api/characters', desc: { zh: '获取角色列表', en: 'List characters', ja: 'キャラクター一覧' } },
    { method: 'GET', path: '/api/characters/:id', desc: { zh: '获取角色详情', en: 'Get character details', ja: 'キャラクター詳細' } },
    { method: 'GET', path: '/api/weapons', desc: { zh: '获取武器列表', en: 'List weapons', ja: '武器一覧' } },
    { method: 'GET', path: '/api/items', desc: { zh: '获取材料列表', en: 'List items', ja: 'アイテム一覧' } },
    { method: 'GET', path: '/api/artifacts', desc: { zh: '获取圣遗物/遗器列表', en: 'List artifacts/relics', ja: '聖遺物一覧' } },
    { method: 'GET', path: '/api/guides', desc: { zh: '获取攻略列表', en: 'List guides', ja: 'ガイド一覧' } },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-3xl font-bold text-game-text">{TITLE[locale]}</h1>

        <div className="mb-8 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 text-sm text-game-text-muted">
          {t('comingSoon')} — {t('intro')}
        </div>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-game-text">{t('baseUrl')}</h2>
          <code className="rounded bg-game-surface-alt px-3 py-2 text-sm text-game-primary">
            https://gachia.com/api
          </code>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-game-text">{t('endpoints')}</h2>
          <div className="overflow-hidden rounded-lg border border-game-border">
            <table className="w-full text-sm">
              <thead className="bg-game-surface-alt">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-game-text">{t('method')}</th>
                  <th className="px-4 py-2 text-left font-medium text-game-text">Path</th>
                  <th className="px-4 py-2 text-left font-medium text-game-text">{t('desc')}</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((ep, i) => (
                  <tr key={ep.path} className={i % 2 === 0 ? 'bg-game-surface' : 'bg-game-surface-alt'}>
                    <td className="px-4 py-2">
                      <span className="rounded bg-blue-500/10 px-2 py-0.5 text-xs font-bold text-blue-400">
                        {ep.method}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-game-primary">{ep.path}</td>
                    <td className="px-4 py-2 text-game-text-muted">{ep.desc[locale]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-sm text-game-text-muted">{t('note')}</p>
        <p className="mt-4 text-sm text-game-text-muted">{t('contact')}</p>
      </div>
    </div>
  );
}
