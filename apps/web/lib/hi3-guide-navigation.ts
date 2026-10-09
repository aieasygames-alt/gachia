import type { SupportedLocale } from '@gachia/core';

type Hi3GuideStep = {
  href: string;
  label: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
};

const version: Hi3GuideStep = {
  href: '/hi3/version',
  label: { zh: '版本档案与客户端核对', en: 'Archive and client checks', ja: 'バージョン資料とゲーム内確認' },
  description: { zh: '核对服务器、公告和已持有内容后再做资源决定。', en: 'Check your server, notices, and inventory before spending resources.', ja: 'サーバー、告知、所持内容を確認してから資源を使いましょう。' },
};
const resources: Hi3GuideStep = {
  href: '/hi3/guides/v9-0-resource-returnee-checklist',
  label: { zh: '养成资源核对清单', en: 'Resource checklist', ja: '育成資源チェックリスト' },
  description: { zh: '先清点已有装备和材料，再确认缺口与获取条件。', en: 'Inventory your gear and materials, then check gaps and acquisition requirements.', ja: '装備と素材を棚卸しし、不足分と入手条件を確認。' },
};
const returnee: Hi3GuideStep = {
  href: '/hi3/guides/new-returning-captain-route',
  label: { zh: '新手与回归路线', en: 'New and returning Captain route', ja: '初心者・復帰ルート' },
  description: { zh: '按账号进度安排登录检查、剧情与养成顺序。', en: 'Plan account checks, story progress, and upgrades around your account.', ja: 'アカウントの進行に合わせて確認、ストーリー、育成の順序を整理。' },
};

export const HI3_GUIDE_NEXT_STEPS: Record<string, Hi3GuideStep[]> = {
  'v9-0-official-update-guide': [version, returnee, resources],
  'new-returning-captain-route': [
    { href: '/hi3/download', label: { zh: '官网与下载安装', en: 'Official site and installation', ja: '公式サイト・インストール' }, description: { zh: '安装前确认区域、账号和客户端，避免选错服务器。', en: 'Confirm region, account, and client before installing.', ja: 'インストール前に地域、アカウント、クライアントを確認。' } },
    version,
    resources,
  ],
  'v9-0-resource-returnee-checklist': [
    { href: '/hi3/items', label: { zh: '材料资料', en: 'Material entries', ja: '素材資料' }, description: { zh: '对照已收录材料的用途与使用前检查事项。', en: 'Review covered material uses and checks before spending.', ja: '収録素材の用途と使用前の確認事項を参照。' } },
    { href: '/hi3/weapons', label: { zh: '武器资料', en: 'Weapon entries', ja: '武器資料' }, description: { zh: '区分基础武器与超限形态，具体条件以客户端为准。', en: 'Distinguish base and PRI-ARM entries; confirm requirements in the client.', ja: '通常武器と超限形態を区別し、条件はゲーム内で確認。' } },
    version,
  ],
};

export const HI3_GUIDE_SCOPE: Record<SupportedLocale, { label: string; notice: string }> = {
  zh: { label: '资料参考版本', notice: '本页引用全球服版本公告，不代表对应服务器当前正在进行的活动或补给。请先确认账号所在服务器，再以客户端与该服务器官方公告核对日期、奖励和养成条件。' },
  en: { label: 'Reference version', notice: 'This page references global version notices, not a live schedule for your server. Confirm your account’s server, then check dates, rewards, and upgrade requirements in its client and official notices.' },
  ja: { label: '資料参照バージョン', notice: 'グローバル版の告知を参照しており、利用サーバーで現在開催中のイベントや補給を示すものではありません。アカウントのサーバーを確認し、日程、報酬、育成条件はゲーム内と該当サーバーの公式告知で確認してください。' },
};
