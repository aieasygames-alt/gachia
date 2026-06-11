import type { Metadata } from 'next';
import { LOCALES } from '@gachia/core';
import type { SupportedLocale } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';

const TITLE: Record<string, string> = { zh: '网站地图', en: 'Sitemap', ja: 'サイトマップ' };
const DESCRIPTION: Record<string, string> = {
  zh: 'Gachia 网站地图 — 浏览所有页面和资源',
  en: 'Gachia sitemap — browse all pages and resources',
  ja: 'Gachia サイトマップ — すべてのページとリソース',
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

export default async function SitemapPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = lang as SupportedLocale;

  const games = [
    { id: 'genshin', name: { zh: '原神', en: 'Genshin Impact', ja: '原神' } },
    { id: 'starrail', name: { zh: '崩坏：星穹铁道', en: 'Honkai: Star Rail', ja: '崩壊：スターレイル' } },
    { id: 'wuwa', name: { zh: '鸣潮', en: 'Wuthering Waves', ja: '鳴潮' } },
    { id: 'nte', name: { zh: '无限暖暖', en: 'Infinity Nikki', ja: '無限ニキ' } },
    { id: 'zzz', name: { zh: '绝区零', en: 'Zenless Zone Zero', ja: 'ゼンレスゾーンゼロ' } },
    { id: 'guihuan', name: { zh: '归环', en: 'Guihuan', ja: '帰環' } },
    { id: 'sea', name: { zh: '遗忘之海', en: 'Sea of Remnants', ja: 'シー・オブ・レムナンツ' } },
  ];

  const categories: { key: string; label: Record<string, string> }[] = [
    { key: 'characters', label: { zh: '角色图鉴', en: 'Characters', ja: 'キャラクター' } },
    { key: 'weapons', label: { zh: '武器', en: 'Weapons', ja: '武器' } },
    { key: 'items', label: { zh: '材料道具', en: 'Items', ja: 'アイテム' } },
    { key: 'guides', label: { zh: '攻略百科', en: 'Guides', ja: 'ガイド' } },
    { key: 'tier-list', label: { zh: '节奏榜', en: 'Tier List', ja: 'ティアリスト' } },
    { key: 'calculator', label: { zh: '计算器', en: 'Calculator', ja: '計算機' } },
    { key: 'map', label: { zh: '地图', en: 'Map', ja: 'マップ' } },
    { key: 'build', label: { zh: '配装', en: 'Builds', ja: 'ビルド' } },
    { key: 'compare', label: { zh: '对比', en: 'Compare', ja: '比較' } },
    { key: 'teams', label: { zh: '配队', en: 'Teams', ja: 'パーティ' } },
    { key: 'artifacts', label: { zh: '圣遗物/遗器', en: 'Artifacts', ja: '聖遺物' } },
    { key: 'disk-sets', label: { zh: '光盘套装', en: 'Disk Sets', ja: 'ディスク' } },
    { key: 'redeem-codes', label: { zh: '兑换码', en: 'Redeem Codes', ja: '交換コード' } },
    { key: 'gacha', label: { zh: '祈愿', en: 'Gacha', ja: 'ガチャ' } },
    { key: 'anomalies', label: { zh: '异象', en: 'Anomalies', ja: 'アノマリー' } },
  ];

  const legal: { key: string; label: Record<string, string> }[] = [
    { key: 'privacy', label: { zh: '隐私政策', en: 'Privacy Policy', ja: 'プライバシーポリシー' } },
    { key: 'terms', label: { zh: '服务条款', en: 'Terms of Service', ja: '利用規約' } },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold text-game-text">{TITLE[locale]}</h1>

      {/* Home */}
      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold text-game-text">
          {locale === 'zh' ? '首页' : locale === 'ja' ? 'ホーム' : 'Home'}
        </h2>
        <ul className="space-y-2">
          <li>
            <Link href="/" className="text-game-primary hover:underline">
              {locale === 'zh' ? 'Gachia 首页' : locale === 'ja' ? 'Gachia ホーム' : 'Gachia Home'}
            </Link>
          </li>
        </ul>
      </section>

      {/* Games */}
      {games.map((game) => (
        <section key={game.id} className="mb-10">
          <h2 className="mb-4 text-xl font-semibold text-game-text">
            {game.name[locale]}
          </h2>
          <ul className="columns-2 gap-4 space-y-2 md:columns-3">
            <li>
              <Link href={`/${game.id}` as '/'} className="text-game-primary hover:underline">
                {locale === 'zh' ? '总览' : locale === 'ja' ? '概要' : 'Overview'}
              </Link>
            </li>
            {categories.map((cat) => (
              <li key={cat.key}>
                <Link href={`/${game.id}/${cat.key}` as '/'} className="text-game-text-muted hover:text-game-primary">
                  {cat.label[locale]}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* Legal */}
      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold text-game-text">
          {locale === 'zh' ? '法律信息' : locale === 'ja' ? '法情報' : 'Legal'}
        </h2>
        <ul className="space-y-2">
          {legal.map((item) => (
            <li key={item.key}>
              <Link href={`/${item.key}` as '/'} className="text-game-text-muted hover:text-game-primary">
                {item.label[locale]}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
