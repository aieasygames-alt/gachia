import { readFileSync, writeFileSync } from 'node:fs';

const sourcePath = new URL('../packages/data/games/aniimo/raw-guides.json', import.meta.url);
const targetPath = new URL('../apps/web/public/data/aniimo/raw-guides.json', import.meta.url);
const guides = JSON.parse(readFileSync(sourcePath, 'utf8'));

const byId = new Map(guides.map((guide) => [guide.id, guide]));

Object.assign(byId.get('release-date'), {
  content: `## 伊莫全球上线时间摘要

伊莫（Aniimo）已全平台上线。PC、主机与云游戏于 2026 年 9 月 16 日开放，iOS 与 Android 于 2026 年 9 月 23 日开放。两个日期保留为历史发售节点，分别对应 PC/主机/云游戏与移动端商店入口。

## 当前仍需核验什么？

Pawprint Studio 开发、免费开放世界 RPG 定位、生物捕捉、Aniipod、Twine、Homeland、实时挑战和区域探索等属于已公开的核心系统。当前服务器条件、地区商店可见性、完整刷新点、数值平衡与活动规则，应以现行客户端和官方公告为准。

## 如何维护这个时间页面

发售日期页面优先引用官方公开信息、官方商店、官网新闻与官方 Wiki。旧测试日期、封闭测试时间和预注册里程碑仅作为历史节点展示，不与当前上线状态混淆。

- PC、主机与云游戏：2026 年 9 月 16 日开放。
- 移动端：2026 年 9 月 23 日开放。
- 当前状态：账号、区服、活动与商店情况以客户端和官方公告为准。`,
  contentEn: `## Aniimo global release milestones

Aniimo is live across platforms. PC, console, and cloud opened on September 16, 2026, followed by iOS and Android on September 23, 2026. These dates are retained as historical launch milestones for Steam, Epic Games Store, Xbox, PlayStation, Google Play, and App Store discovery.

## What still needs live verification?

The developer, free-to-play creature-catching open-world RPG positioning, and systems such as Aniipods, Twine, Homeland, real-time challenges, and regional exploration are public information. Current server conditions, region-specific store availability, complete spawn tables, balance values, and active-event rules should follow the live client and official notices.

## How this release tracker is maintained

This page prioritizes official public sources, including official storefronts, news posts, and the Aniimo Wiki. Older test dates and pre-registration milestones remain historical context rather than current availability claims.

- PC, console, and cloud: Opened September 16, 2026.
- Mobile: Opened September 23, 2026.
- Current status: Check the live client and official notices for account, server, and event conditions.`,
  summaryJa: 'Aniimoは全プラットフォームで配信中です。PC・コンソール・クラウドは 2026 年 9 月 16 日、iOS・Android は 2026 年 9 月 23 日に開始しました。両日は過去の配信節目として残し、現在のアカウント、サーバー、イベント、ストア状況は現行クライアントと公式告知を基準にします。',
  contentJa: `## Aniimoのグローバル配信節目

Aniimoは全プラットフォームで配信中です。PC・コンソール・クラウドは 2026 年 9 月 16 日、iOS・Android は 2026 年 9 月 23 日に開始しました。Steam、Epic Games Store、Xbox、PlayStation、Google Play、App Storeにおける発見導線の歴史的な節目として、これらの日付を保持します。

## 現行版で確認が必要な項目

開発元、基本プレイ無料の生物収集オープンワールド RPG という位置付け、Aniipod、Twine、Homeland、リアルタイムチャレンジ、地域探索は公開情報です。現在のサーバー条件、地域別ストア表示、完全な出現表、数値バランス、開催中イベント規則は現行クライアントと公式告知を基準にします。

## このページの更新方針

公式ストア、ニュース、Aniimo Wikiを含む公式公開情報を優先します。過去のテスト日程と事前登録の節目は、現在の配信可否ではなく履歴として扱います。

- PC・コンソール・クラウド：2026 年 9 月 16 日に開始。
- モバイル：2026 年 9 月 23 日に開始。
- 現在の状態：アカウント、サーバー、イベント条件は現行クライアントと公式告知で確認。`,
});

Object.assign(byId.get('beginner-guide'), {
  summaryEn: 'Aniimo beginner guide to catching with Aniipods, Twine, exploration, Egg Heist, and Homeland. Use the live client for exact routes, spawns, unlocks, and progression conditions.',
  summaryJa: 'Aniimoの序盤では、捕獲、Twine、環境遭遇、Egg Heist、Homelandを理解することが重要です。Aniipodで捕獲し、集めたAniimoの能力を戦闘、移動、謎解きに使います。正確な数値、出現地点、解放条件は現行クライアントで確認してください。',
  contentJa: `## 生物の捕獲

Aniimoの中核ループの一つは、Aniipodを使った捕獲です。捕獲には行動パターン、罠、タイミング、環境条件が関係するため、まず各Aniimoの挙動を確認し、天候、時間帯、地域条件を現行クライアントで記録します。

## Twine

Twineは集めたAniimoとつながり、その能力をパズル、戦闘、移動、探索に使う仕組みです。見た目の変身だけでなく、生物の能力をマップ攻略と戦闘の道具として扱います。

## 環境による遭遇

一部のAniimoは地域、天候、自然現象、時間帯に関係する可能性があります。PVや単発の遭遇を最終出現表として扱わず、地域、条件、必要なTwine能力を現行版で確認してください。

## Egg Heist

Egg Heistは3人チームでLost Islesを探索し、遭遇と戦闘を行うPVEVPモードです。ルート、報酬、対抗要素は現行クライアントと公式告知で確認します。

## Homeland と RV

Pathfinderには個人用RVとHomelandがあり、作物栽培、装飾、Aniimoとの交流ができます。

- 図鑑状態：このサイトでは現在89体の公開Aniimoを追跡しています。
- マップ状態：6つの公開地域をマップとガイド導線に接続済み。
- 更新重点：出現地点、天候条件、Twine用途、スクリーンショットを現行版に合わせて補います。`,
  currentVersion: 'Aniimo S1 live systems reference; verify routes, spawns, and progression in the current client',
  updatedAt: '2026-09-30',
});

Object.assign(byId.get('map-regions'), {
  summaryEn: 'Aniimo map coverage organizes public regions into searchable, expandable route pages. With S1 live across platforms, verify regions, creature leads, mechanics, spawns, weather, time windows, Twine abilities, and route screenshots while separating live-client checks from open items.',
  summaryJa: 'Aniimoのマップガイドでは、公開済み地域を検索しやすく、後から拡張しやすいルートページとして整理します。S1配信中の現在は、地域、代表Aniimo、機構、出現地点、天候、時間帯、Twine能力、ルート画像を現行クライアントで確認し、確認済み情報と未確認項目を分けます。',
  contentEn: `## How the Aniimo map guide works

The Aniimo map guide organizes known public regions into search-friendly route pages. Each region connects official scenery, representative Aniimo, mechanics, and verification notes. With S1 live, the map acts as a hub from a creature query to a region, route condition, or related evolution line without presenting preview material as a final coordinate table.

## What needs live verification?

Exact spawn points, time windows, weather requirements, traversal locks, and Twine requirements must be verified in the current client. The guide separates public region names and confirmed mechanics from route details that still need repeatable in-game checks.

## Current map improvements

Prioritize coordinates, route screenshots, weather and time filters, required Twine abilities, and internal links from regions to related Aniimo pages. This makes the relationship among locations, elements, roles, and evolution lines useful to players and understandable to search crawlers.

- Mistwoods: An off-key singing echoes among withered twigs, while swamp mists and glimmer fruits guide lost travelers.
- Echoback Landing: A stranded giant Aniimo waits away from the sea, with answers hidden in the enchanting Echoback singing.
- Sea of Flowers: Endless flowers paint the landscape, surrounding a perfume village that has lived beside Aniimo for generations.
- Blitzwood: Thunder drawn by Bolties carves scorched furrows through grassy slopes as electric sparks crackle in the woods.
- Nimbus Fields: Soft clouds caress thick grassland, where field Aniimo move through open routes and sky-adjacent paths.
- Forest of Falling Stars: Upstream from the forest, Celestises glide among starine trees like tiny shooting stars.`,
  contentJa: `## Aniimoマップガイドの使い方

Aniimoのマップガイドは、公開済み地域を検索しやすいルートページとして整理します。各地域では公式風景、代表的なAniimo、関連システム、確認メモをまとめます。S1配信中の現在は、特定のAniimoから地域、ルート条件、進化ラインへつなぎつつ、プレビュー情報を最終座標表として扱わないことが重要です。

## 現行版で確認が必要な項目

正確な出現地点、時間帯、天候条件、移動制限、必要なTwine能力は現行クライアントで確認します。公開済み地域名と確認済み機構を、再現可能な実機確認が必要なルート詳細から分けて掲載します。

## 現在のマップ更新方針

座標、ルート画像、天候・時間帯フィルター、必要なTwine能力、地域ページから関連Aniimo図鑑への内部リンクを優先します。これにより、地域、属性、役割、進化ラインの関係をプレイヤーと検索エンジンの両方が把握しやすくなります。

- Mistwoods：枯れ枝と霧に包まれた森林地域。Emberpup、Iris、Leafy を追跡。
- Echoback Landing：座礁した巨大 Aniimo と歌声の手がかりがある地域。
- Sea of Flowers：花畑と香りの村を中心にした地域。
- Blitzwood：雷の現象が強く、電気系 Aniimo の導線に重要。
- Nimbus Fields：草地、雲、開けた移動ルートに関係。
- Forest of Falling Stars：Celestis、Stellarys、Susuta など希少な項目と関係。`,
});

for (const id of ['release-date', 'beginner-guide', 'map-regions']) {
  if (!byId.has(id)) throw new Error(`Missing Aniimo guide: ${id}`);
}

const json = `${JSON.stringify(guides, null, 2)}\n`;
writeFileSync(sourcePath, json);
writeFileSync(targetPath, json);
