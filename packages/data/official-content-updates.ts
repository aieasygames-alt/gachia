import type { GameId } from '@gachia/core';
import type { SupportedLocale } from '@gachia/core';

type LocalizedText = Record<SupportedLocale, string>;

export interface OfficialContentUpdate {
  id: string;
  gameId: GameId;
  checkedAt: string;
  publishedAt?: string;
  kind: 'version' | 'hotfix' | 'reference';
  region: LocalizedText;
  title: LocalizedText;
  facts: LocalizedText[];
  boundary: LocalizedText;
  sources: string[];
}

const text = (zh: string, en: string, ja: string): LocalizedText => ({ zh, en, ja });

// Publication, scheduled server times, and our source check are separate facts.
export const OFFICIAL_CONTENT_UPDATES: OfficialContentUpdate[] = [
  {
    id: 'endfield-danqingdu-cn', gameId: 'endfield', checkedAt: '2026-10-18', publishedAt: '2026-10-15', kind: 'version',
    region: text('国服公告；不外推其他地区', 'Mainland China notice; not a global schedule', '中国本土版告知。他地域へ時刻を流用しません'),
    title: text('「丹青渡」版本：新区域、干员与工业系统', 'CN Danqingdu: area, operators and industry systems', '中国版「丹青渡」：新エリア・オペレーター・工業システム'),
    facts: [
      text('新增「武陵 - 祀的画」，主线至第二章进程Ⅷ「着新墨」，版本新干员为祀、明河；不代表两人寻访已同时开放。', 'Adds Wuling — Si’s Painting and Chapter II Process VIII. Si and Minghe are version additions, not simultaneously open featured banners.', '「武陵 - 祀の画」と第二章進程Ⅷを追加。祀・明河はバージョン追加であり、両者のピックアップ同時開催を意味しません。'),
      text('「万物更新」祀寻访至11月5日11:59；「烟火邀星河」明河寻访11月5日12:00开始（均为服务器时间）。', 'Si’s featured search ends November 5 at 11:59; Minghe’s begins November 5 at 12:00. Both use server time.', '祀の尋訪は11月5日11:59まで、明河の尋訪は11月5日12:00開始。いずれもサーバー時刻です。'),
      text('维护与修复补偿分别为嵌晶玉×900，更新前创建角色并解锁邮箱后领取；邮件在下次版本维护时过期。不是所有新账号均可领取。', 'Maintenance and fix compensation are 900 currency each, for characters created before the update after mailbox unlock. Mail expires at the next version maintenance; new accounts are not universally eligible.', 'メンテナンス・修正補償は各900。更新前に作成したキャラクターがメール解放後に受取可能で、次回バージョンメンテナンス時に失効します。新規全員対象ではありません。'),
      text('新增自动农植机、连携技优先级、装备方案和舱室班组；旧测试蓝图、成本与解锁条件须按当前版本复核。', 'Adds automated planting, combo priority, equipment presets and cabin shifts. Recheck test blueprints, costs and unlocks against this version.', '自動農植機、連携技優先度、装備プラン、船室班組を追加。旧テストの設計図・コスト・解放条件は現行版で再確認が必要です。'),
      text('10月22日12:00开启「卡莉的芳菲童话」，至11月5日04:00；「万物有灵」累计7日签到可获寻访凭证×5，至11月5日11:59（服务器时间）。', 'The photo event runs October 22, 12:00–November 5, 04:00. Seven-day sign-in grants five search tickets by November 5, 11:59, all server time.', '撮影イベントは10月22日12:00～11月5日04:00。7日ログインで尋訪券5枚、11月5日11:59まで。サーバー時刻です。'),
    ],
    boundary: text('维护计划为10月15日06:00—12:00（UTC+8），不据计划推断实际开服时刻。旧Pioneer Test仅作历史参考，国际服状态独立核验。', 'Maintenance was scheduled October 15, 06:00–12:00 UTC+8; this does not prove the actual completion time. Pioneer Test is historical and international status needs separate verification.', '予定メンテナンスは10月15日06:00～12:00 UTC+8。実際の終了時刻の証明ではありません。Pioneer Testは履歴であり、国際版は別途確認します。'),
    sources: ['https://endfield.hypergryph.com/news/6094'],
  },
  {
    id: 'hi3-cn-91', gameId: 'hi3', checkedAt: '2026-10-18', kind: 'version',
    region: text('国服9.1 / 全球服9.0资料档案分流', 'CN v9.1 / separate Global v9.0 archive', '中国版9.1とグローバル版9.0資料を区別'),
    title: text('国服9.1「时序照新」已上线', 'CN v9.1 “时序照新” is live', '中国版Ver.9.1「时序照新」配信中'),
    facts: [
      text('国服官网标题已明确9.1「时序照新」正式上线；本次仅确认版本状态，不把10月18日核验日写成发布日期。', 'The CN official homepage confirms v9.1 is live. October 18 is our check date, not an asserted release date.', '中国公式サイトでVer.9.1配信を確認。10月18日は確認日であり、配信日とは断定しません。'),
      text('下方9.0装备、人偶与资源内容来自全球服英文公告，是已收录资料档案，不代表国服当前补给、活动或9.1新增内容。', 'The v9.0 gear, AstralOp and resource entries below use the Global English notice. They are collected archive data, not current CN supplies, events or v9.1 additions.', '下記の9.0装備・人偶・資源はグローバル版英語告知の収録資料で、中国版の現行補給・イベント・9.1追加内容ではありません。'),
    ],
    boundary: text('9.1详细更新、角色、补给与活动时间尚待完整官方公告核验，不从主页标题或其他地区公告补全。', 'Detailed v9.1 changes, characters, supplies and dates await the full official notice; do not infer them from a headline or another region.', '9.1の詳細、キャラクター、補給、イベント期間は公式全文の確認待ち。見出しや他地域告知から補完しません。'),
    sources: ['https://bh3.mihoyo.com/'],
  },
  {
    id: 'aniimo-oct16', gameId: 'aniimo', checkedAt: '2026-10-18', publishedAt: '2026-10-16', kind: 'hotfix',
    region: text('国服官方公告', 'CN official notice', '中国版公式告知'),
    title: text('10月16日周更新与家园赛季', 'October 16 weekly update and Homeland season', '10月16日週次更新とホームランドシーズン'),
    facts: [
      text('官方已进行不停服资源更新，重启客户端获取最新资源。月露萝卜、盈月椒变异概率及产物盈月值提升，不填未公布的倍率。', 'A live resource update is available after restarting. Moondew Radish and Yingyue Pepper mutation chances and seasonal output value increase; no unpublished multiplier is claimed.', '再起動で取得する無停止リソース更新。月露萝卜・盈月椒の変異確率と生産物の盈月値が上昇。未公開倍率は記載しません。'),
      text('10月21日04:00开放家园赛季第三阶段「丰收集会」，举办或参与均可获奖励；该公告未注明时区，不自行换算。', 'Homeland phase three, “丰收集会”, opens October 21 at 04:00, with rewards for hosting or joining. The notice does not specify a timezone; none is invented.', 'ホームランド第3段階「丰收集会」は10月21日04:00開始。開催・参加で報酬。告知にタイムゾーンの明記がないため推測換算しません。'),
      text('辉石×100更新补偿要求1.1版本更新前完成注册；公告未给出领取截止日。另有抢蛋大作战钥匙门、家具数量与手柄批量加速等修复优化。', 'The 100-currency compensation requires registration before the v1.1 update; no claim deadline is given. Fixes include the egg mode key door, furniture quantity and controller bulk acceleration.', '補償100は1.1更新前の登録が条件。受取期限は未記載。卵モードの鍵扉、家具数量、手柄の一括加速などを修正・改善。'),
    ],
    boundary: text('同日「逐风启程·下」内容伊览标题已公开，图片细节和实装日期仍待核验；不把下半赛季预览与「逐风启程·上」周更新混为同一次全部实装。', 'The lower-half season preview is also published, but its images and implementation dates need verification. Do not treat it and the upper-half weekly update as one fully live release.', '同日の下半期プレビューは公開済みですが、画像詳細と実装日は確認待ち。上半期週次更新と混同して全実装扱いにしません。'),
    sources: ['https://www.yimo.com/newslist/detail/100043', 'https://www.yimo.com/newslist/detail/100046'],
  },
  {
    id: 'zzz-feioni-oct17', gameId: 'zzz', checkedAt: '2026-10-18', publishedAt: '2026-10-17', kind: 'reference',
    region: text('官方中文资料', 'Official Chinese reference', '公式中国語資料'),
    title: text('菲欧妮机制介绍已公开', 'Official Feioni mechanics reference published', '菲欧妮の公式メカニクス紹介を公開'),
    facts: [text('10月17日官方资料库已公开菲欧妮战斗相关信息，可查看原文机制图；本站尚未逐图录入技能数值、材料和配装结论。', 'The October 17 official database post includes combat information and mechanic images. Skill values, materials and build conclusions have not been transcribed or validated here.', '10月17日の公式資料庫で戦闘情報と機構画像を公開。技能数値・素材・ビルド結論は本サイトでは未検証です。')],
    boundary: text('角色宣传不等于3.3已上线；上线日期与卡池继续按正式公告核验，10月11日到期的节目码不恢复为有效。', 'A character post does not establish that v3.3 is live. Verify the release and banners separately; program codes expired October 11 stay expired.', 'キャラ紹介はv3.3実装の証明ではありません。実装日とバナーは別途確認し、10月11日期限のコードは失効済みのままです。'),
    sources: ['https://zenless.hoyoverse.com/zh-cn/news/166907'],
  },
  {
    id: 'wuwa-suoming-oct18', gameId: 'wuwa', checkedAt: '2026-10-18', publishedAt: '2026-10-18', kind: 'reference',
    region: text('国服官网动态', 'CN official news', '中国版公式ニュース'),
    title: text('锁暝战斗演示：3.7角色资料增量', 'Suoming combat showcase: v3.7 reference update', '鎖暝戦闘紹介：Ver.3.7資料更新'),
    facts: [text('官网10月18日新闻列表新增「共鸣者战斗演示 | 锁暝」。这是演示来源，不是技能倍率、毕业声骸或强度排名的实测依据。', 'The official October 18 news list adds the Suoming combat showcase. A showcase is not validation of skill multipliers, best Echoes or a tier ranking.', '公式10月18日ニュースに鎖暝の戦闘紹介を追加。紹介映像は技能倍率・最適エコー・Tierの実測根拠ではありません。')],
    boundary: text('当前仍按3.7整理，未据本轮核验确认3.8；演示与当前卡池剩余时间分别核对。', 'Coverage remains v3.7; this check does not confirm v3.8. Verify banner deadlines separately from showcase publication.', '引き続き3.7資料として扱い、この確認では3.8を確定していません。映像公開とバナー期限は別途確認します。'),
    sources: ['https://mc.kurogames.com/main/news'],
  },
  {
    id: 'nte-oct16-17', gameId: 'nte', checkedAt: '2026-10-18', kind: 'hotfix',
    region: text('国服1.4；不外推国际服', 'CN v1.4; not a global patch claim', '中国版1.4。国際版へ適用しません'),
    title: text('1.4后续修复：10月16、17日', 'v1.4 follow-up fixes: October 16–17', '1.4追加修正：10月16・17日'),
    facts: [
      text('10月16日更新说明确认番外剧情女性主角日语语音已实装，并修复键盘操作、任务与界面问题。', 'The October 16 update confirms Japanese voice implementation for the female protagonist in the side story, plus keyboard, quest and UI fixes.', '10月16日更新で番外物語の女性主人公日本語音声を実装し、キーボード操作・任務・UIを修正。'),
      text('10月17日更新涉及番外剧情任务对话、「诡乐屋不打烊」首领无敌与任务阻断等问题。公告发布日与生效更新日不同，按原文日期分段阅读。', 'The October 17 update covers side-story dialogue, boss invulnerability and blockers in “诡乐屋不打烊”. Publication and update dates differ; follow each notice’s dated section.', '10月17日更新は番外会話や「诡乐屋不打烊」のボス無敵・進行不能を修正。掲載日と更新日は異なるため、原文の日付区分を確認してください。'),
    ],
    boundary: text('明音凛拥抱表现问题在10月16日公告中仍属“近期更新中修复”，不能改写为已经修好；这些热修复不是1.5版本。', 'The Mingyin Lin hug issue is still described as a forthcoming fix in the October 16 notice, not already fixed. These hotfixes are not v1.5.', '10月16日告知の明音凛の抱擁問題は今後の修正予定で、修正済みとしません。これらは1.5ではありません。'),
    sources: ['https://yh.wanmei.com/news/gamebroad/20261015/264630.html', 'https://yh.wanmei.com/news/gamebroad/20261016/264655.html'],
  },
];

export function getOfficialContentUpdates(gameId: GameId) {
  return OFFICIAL_CONTENT_UPDATES.filter((entry) => entry.gameId === gameId);
}
