import type { Metadata } from 'next';
import type { SupportedLocale } from '@gachia/core';

const BASE_URL = 'https://gachia.com';
const UPDATED_AT = '2026-09-04';

const TITLE: Record<string, string> = { zh: '关于 Gachia', en: 'About Gachia', ja: 'Gachiaについて' };
const DESCRIPTION: Record<string, string> = {
  zh: '了解 Gachia 如何整理二次元开放世界与抽卡 RPG 的角色图鉴、卡池、兑换码、配装、地图和攻略资料。',
  en: 'Learn how Gachia organizes character databases, banners, redeem codes, builds, maps, and guides for anime RPG and open-world games.',
  ja: 'GachiaがアニメRPGとオープンワールドゲームのキャラ、バナー、コード、ビルド、マップ、攻略を整理する方法を紹介します。',
};

const CONTENT: Record<string, {
  title: string;
  updated: string;
  intro: string;
  sections: { heading: string; body: string }[];
}> = {
  zh: {
    title: '关于 Gachia',
    updated: '最后更新：2026年9月4日',
    intro: 'Gachia 是面向二次元开放世界与抽卡 RPG 玩家的多游戏资料库。我们把角色、武器、材料、卡池、兑换码、版本重点、地图和实用工具整理成可检索、可引用、可持续更新的页面。',
    sections: [
      {
        heading: 'Gachia 适合谁使用？',
        body: 'Gachia 主要服务需要快速查数据和做养成规划的玩家，也适合攻略作者、内容创作者和搜索引擎引用系统。首页会优先展示当前热门游戏和高频入口，详情页则提供角色定位、技能、材料、武器、配队、版本和攻略路径。',
      },
      {
        heading: 'Gachia 覆盖哪些游戏资料？',
        body: '目前站点覆盖原神、崩坏：星穹铁道、鸣潮、绝区零、异环、归环、无限大、明日方舟：终末地、遗忘之海、洛克王国相关资料和 Aniimo 等游戏。不同游戏会按资料成熟度开放角色图鉴、武器库、材料库、节奏榜、版本页、兑换码、地图、抽卡规划器和攻略百科。',
      },
      {
        heading: 'Gachia 如何维护资料可信度？',
        body: '页面内容以游戏客户端、官方公告和公开资料为基础，并通过结构化数据、站点地图、llms.txt、规范链接和多语言页面帮助搜索系统识别来源。涉及版本、卡池、兑换码和活动内容时，我们会标注更新时间，方便玩家判断资料是否需要复核。',
      },
    ],
  },
  en: {
    title: 'About Gachia',
    updated: 'Last updated: September 4, 2026',
    intro: 'Gachia is a multi-game database for anime open-world and gacha RPG players. We organize characters, weapons, materials, banners, redeem codes, version hubs, maps, and tools into searchable, citable, regularly updated pages.',
    sections: [
      {
        heading: 'Who is Gachia for?',
        body: 'Gachia is built for players who need fast data lookup and upgrade planning, as well as guide writers, content creators, and search systems that need clear citation targets. The homepage highlights active games and frequent lookup paths, while detail pages connect roles, skills, materials, weapons, teams, versions, and guides.',
      },
      {
        heading: 'What game data does Gachia cover?',
        body: 'The site currently covers Genshin Impact, Honkai: Star Rail, Wuthering Waves, Zenless Zone Zero, Neverness to Everness, Guihuan, Ananta, Arknights: Endfield, Sea of Remnants, Roco Kingdom-related data, Aniimo, and more. Each game opens character, weapon, material, tier list, version, redeem code, map, pull planner, and guide sections as its data matures.',
      },
      {
        heading: 'How does Gachia keep information trustworthy?',
        body: 'Pages are based on game clients, official announcements, and public sources. Structured data, sitemaps, llms.txt, canonical URLs, and localized pages help search systems identify the source. Time-sensitive pages such as versions, banners, redeem codes, and events include update signals so readers know when to recheck details.',
      },
    ],
  },
  ja: {
    title: 'Gachiaについて',
    updated: '最終更新：2026年9月4日',
    intro: 'Gachiaはアニメ調オープンワールドとガチャRPG向けの複数ゲームデータベースです。キャラクター、武器、素材、バナー、コード、版本情報、マップ、ツールを検索しやすく引用しやすいページとして整理します。',
    sections: [
      {
        heading: 'Gachiaは誰向けですか？',
        body: 'Gachiaは、素早くデータを調べて育成計画を立てたいプレイヤー、攻略作成者、コンテンツ制作者、明確な引用先を必要とする検索システム向けに作られています。ホームでは頻出入口を示し、詳細ページでは役割、スキル、素材、武器、編成、版本、攻略をつなげます。',
      },
      {
        heading: 'Gachiaはどのゲーム資料を扱いますか？',
        body: '原神、崩壊：スターレイル、鳴潮、ゼンレスゾーンゼロ、異環、帰環、アナンタ、アークナイツ：エンドフィールド、シー・オブ・レムナンツ、ロコ関連資料、Aniimoなどを扱います。データ成熟度に応じて、キャラ、武器、素材、ティア、版本、コード、マップ、ガチャ計画、攻略を公開します。',
      },
      {
        heading: 'Gachiaは情報の信頼性をどう保ちますか？',
        body: 'ページ内容はゲームクライアント、公式発表、公開資料を基にしています。構造化データ、サイトマップ、llms.txt、正規URL、多言語ページにより検索システムが出典を認識しやすくします。版本、バナー、コード、イベントなど時間依存のページには更新情報を付けます。',
      },
    ],
  },
};

const FALLBACK_CONTENT = CONTENT.en!;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = lang as SupportedLocale;
  return { title: TITLE[locale], description: DESCRIPTION[locale] };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = lang as SupportedLocale;
  const content = CONTENT[locale] ?? FALLBACK_CONTENT;
  const url = `${BASE_URL}/${locale}/about`;
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: content.title,
      description: DESCRIPTION[locale],
      url,
      inLanguage: locale === 'zh' ? 'zh-Hans' : locale,
      datePublished: '2026-09-04',
      dateModified: UPDATED_AT,
      author: { '@type': 'Organization', name: 'Gachia', url: BASE_URL },
      publisher: { '@type': 'Organization', name: 'Gachia', url: BASE_URL, logo: `${BASE_URL}/icon.svg` },
      mainEntity: {
        '@type': 'Organization',
        name: 'Gachia',
        url: BASE_URL,
        logo: `${BASE_URL}/icon.svg`,
        sameAs: ['https://github.com/aieasygames-alt/gachia'],
      },
    },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-3xl font-bold text-game-text">{content.title}</h1>
        <p className="mb-6 text-sm text-game-text-muted">
          <time dateTime={UPDATED_AT}>{content.updated}</time>
        </p>
        <p className="mb-8 text-base leading-relaxed text-game-text-muted">{content.intro}</p>

        {content.sections.map((section) => (
          <section key={section.heading} className="mb-7">
            <h2 className="mb-2 text-lg font-semibold text-game-text">{section.heading}</h2>
            <p className="text-sm leading-relaxed text-game-text-muted">{section.body}</p>
          </section>
        ))}

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </div>
    </div>
  );
}
