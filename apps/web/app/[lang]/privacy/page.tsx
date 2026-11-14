import { platformMetadata } from '@/lib/platform-metadata';
import type { Metadata } from 'next';
import type { SupportedLocale } from '@gachia/core';

const TITLE: Record<string, string> = { zh: '隐私政策', en: 'Privacy Policy', ja: 'プライバシーポリシー' };
const DESCRIPTION: Record<string, string> = {
  zh: 'Gachia 隐私政策说明 Google Analytics、Clarity、AdSense、已停用的登录与云同步、历史账号数据、本地工具及数据访问与删除请求。',
  en: 'Gachia Privacy Policy explains Google Analytics, Clarity, AdSense, disabled sign-in and cloud sync, historical account data, local tools, and access or deletion requests.',
  ja: 'Gachiaのプライバシーポリシーでは、Google Analytics、Clarity、AdSense、停止中のログインとクラウド同期、過去のアカウントデータ、ローカルツール、開示・削除請求を説明します。',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = lang as SupportedLocale;
  return platformMetadata(locale, '/privacy', TITLE[locale]!, DESCRIPTION[locale]!);
}

const CONTENT: Record<string, { title: string; sections: { heading: string; body: string }[] }> = {
  zh: {
    title: '隐私政策',
    sections: [
      { heading: '0. 隐私选择与删除请求', body: '非必要访问分析默认关闭，您可通过页面左下角“隐私偏好”允许或拒绝 Google Analytics。广告和 Microsoft Clarity 会话回放暂不加载。更改选择会重新加载页面，不能撤回已发送的数据。偏好保存在本机浏览器，不同设备需分别设置。账号登录、收藏和云端同步目前停用；本地工具仍可使用。历史账号数据保留，停用不代表删除。账号访问或删除请求请私密发送至 gachiawiki@gmail.com；不要发送密码、验证码、会话或访问令牌，也不要在公开 Issue 发布个人数据。我们先核验账号归属再处理请求。目前没有自助删除入口，尚未完成实际删除及备份到期清理验收；记录过期不等于已物理删除，第三方保留设置仍待核实。' },
      {
        heading: '1. 概述',
        body: 'Gachia（"我们"）尊重您的隐私。本隐私政策说明我们如何收集、使用和保护您的个人信息。本政策用于说明数据处理方式，不代替适用情况下所需的单独同意。',
      },
      {
        heading: '2. 信息收集',
        body: '您明确允许后，我们使用 Google Analytics 收集访问数据，包括页面浏览量、访问时长、浏览器类型和设备信息。当前版本不提供 Google 登录，不新增账号会话、收藏、角色云存档、地图云同步或共享配装。历史版本可能已存储姓名、邮箱、头像、账号标识、会话令牌、IP 地址、User-Agent 及主动保存的用户内容；这些数据未因功能停用而删除。广告和访问分析服务还可能处理设备、浏览器、网络与交互信息，详见第三方服务说明。',
      },
      {
        heading: '3. 本地存储',
        body: '材料规划器库存、地图进度等本地工具数据保存在当前浏览器 localStorage 中，不再上传账号云端。清除浏览器数据或更换设备可能丢失本地进度。历史服务器数据及已有公开共享配装仍保留。您可以清除浏览器数据来删除本地信息，并通过联系我们请求删除账号及服务器数据。',
      },
      {
        heading: '4. 第三方服务',
        body: '我们使用以下第三方服务：\n\n• Google Analytics — 网站流量分析\n• Microsoft Clarity — 使用行为分析与会话回放工具\n• Google AdSense — 单独选择允许后加载的广告服务（与访问分析分开选择）\n• Google 登录 — 历史账号认证，当前已停用\n• Google Fonts — 网页字体渲染\n• Cloudflare — 网站托管和 CDN\n\n这些服务可能接收 IP 地址、浏览器和设备信息，并按其配置使用 Cookie 或类似技术。脚本接入本身不说明广告是否个性化、数据保留期限或同意状态；相关处理取决于实际服务配置、浏览器设置及适用要求。请参阅 Google 和 Microsoft 的隐私政策了解详情。',
      },
      {
        heading: '5. 数据安全',
        body: '我们通过 HTTPS、访问控制和受限的服务密钥保护数据。账号与用户内容会在提供服务所需期间保存；会话和验证记录具有有效期，但尚未验收统一的物理清理期限。您可以通过 私密联系邮箱 gachiawiki@gmail.com（不要在公开 GitHub Issue 提供个人数据）请求访问或删除个人数据。',
      },
      {
        heading: '6. 儿童隐私',
        body: '本网站不针对 13 岁以下儿童，也不会有意收集儿童的个人信息。',
      },
      {
        heading: '7. 政策更新',
        body: '我们可能会不时更新本隐私政策。更新后的政策将在本页面上发布，并更新"最后更新"日期。',
      },
      {
        heading: '8. 联系我们',
        body: '如果您对本隐私政策有任何疑问，请通过 GitHub 仓库提交 Issue 联系我们。',
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    sections: [
      { heading: '0. Privacy choices and deletion requests', body: 'Optional analytics are off by default. Use Privacy preferences at the bottom left to allow or reject Google Analytics. Ads and Microsoft Clarity session replay remain disabled. Changes reload the page and cannot recall data already sent. Preferences are local to each browser. Account sign-in, favorites and cloud sync are currently disabled; local tools remain available. Historical account data is retained, not deleted by disabling these features. Send account access or deletion requests privately to gachiawiki@gmail.com. Never send passwords, verification codes, session/access tokens or personal data in public Issues. Account ownership must be verified before processing. Self-service deletion is not available; actual deletion and backup expiry cleanup have not been accepted in testing. Expiration does not prove physical deletion. Third-party retention settings remain unverified.' },
      {
        heading: '1. Overview',
        body: 'Gachia ("we") respects your privacy. This Privacy Policy explains how we collect, use, and protect your information. This policy describes data processing and does not replace separate consent where required.',
      },
      {
        heading: '2. Information Collection',
        body: 'After you explicitly allow analytics, we use Google Analytics to collect usage data such as page views, visit duration, browser type, and device information. This version does not offer Google sign-in or create account sessions, favorites, character cloud saves, map cloud sync or shared builds. Earlier versions may have stored names, email addresses, profile images, account identifiers, session tokens, IP addresses, user agents and user-saved content. Disabling the features does not delete that historical data. Advertising and analytics services may also process device, browser, network, and interaction information, as described under Third-Party Services.',
      },
      {
        heading: '3. Local Storage',
        body: 'Local tools, including material planner inventory and map progress, store data in your current browser\'s localStorage, with no account cloud upload. Clearing browser data or changing devices can lose local progress. Historical server data and existing public shared builds are retained. You can clear browser data to remove local information and contact us to request deletion of your account and server data.',
      },
      {
        heading: '4. Third-Party Services',
        body: 'We use the following third-party services:\n\n• Google Analytics — website traffic analysis\n• Microsoft Clarity — usage analytics and session replay tools\n• Google AdSense — advertising loaded after a separate opt-in, independent of analytics\n• Google sign-in — historical account authentication, currently disabled\n• Google Fonts — web font rendering\n• Cloudflare — website hosting and CDN\n\nThese services may receive IP addresses, browser and device information, and use cookies or similar technologies according to their configuration. Script integration alone does not establish ad personalization, retention periods, or consent status; processing depends on actual service configuration, browser settings, and applicable requirements. See Google and Microsoft privacy policies for details.',
      },
      {
        heading: '5. Data Security',
        body: 'We protect data using HTTPS, access controls, and restricted service credentials. Account information and user content are retained while needed to provide the service; sessions and verification records have expiry dates, which do not establish physical cleanup deadlines. Request access to or deletion of personal data privately via gachiawiki@gmail.com. Do not post personal data in public GitHub Issues.',
      },
      {
        heading: '6. Children\'s Privacy',
        body: 'This website is not directed at children under 13 and we do not knowingly collect personal information from children.',
      },
      {
        heading: '7. Policy Updates',
        body: 'We may update this Privacy Policy from time to time. Updated policies will be posted on this page with an updated "Last Updated" date.',
      },
      {
        heading: '8. Contact Us',
        body: 'If you have any questions about this Privacy Policy, please contact us by submitting an Issue on our GitHub repository.',
      },
    ],
  },
  ja: {
    title: 'プライバシーポリシー',
    sections: [
      { heading: '0. 設定と削除請求', body: '任意のアクセス分析は初期状態で無効です。左下のプライバシー設定からGoogle Analyticsを許可または拒否できます。広告とMicrosoft Clarityのセッション再生は無効です。変更時は再読み込みし、送信済みデータは取り消せません。設定はブラウザごとに保存されます。アカウントのログイン、お気に入り、クラウド同期は現在停止中です。ローカルツールは利用できます。過去のアカウントデータは保持され、機能停止によって削除されません。アカウントの開示・削除請求はgachiawiki@gmail.comへ非公開メールでお送りください。パスワード、認証コード、セッショントークンを送信せず、公開Issueに個人情報を書かないでください。本人確認後に処理します。セルフサービス削除はなく、実際の削除とバックアップ期限後の消去は未検証です。有効期限切れは物理削除の証明ではなく、第三者の保存設定も未確認です。' },
      {
        heading: '1. 概要',
        body: 'Gachia（以下「当方」）は、お客様のプライバシーを尊重いたします。本プライバシーポリシーは、お客様の情報の収集、使用、保護について説明するものです。本ポリシーはデータの取扱いを説明するもので、必要な場合の個別の同意に代わるものではありません。',
      },
      {
        heading: '2. 情報収集',
        body: '明示的な許可後に Google Analytics でページビュー、訪問時間、ブラウザ、端末情報を収集します。現在のバージョンでは Google ログイン、新規セッション、お気に入り、キャラクターのクラウド保存、マップのクラウド同期、共有ビルドの作成は利用できません。過去の氏名、メールアドレス、画像、アカウント識別子、セッショントークン、IP アドレス、User-Agent、保存されたユーザーコンテンツは機能停止によって削除されません。広告・分析サービスも端末、ブラウザ、ネットワーク、操作に関する情報を処理する場合があります。サードパーティサービスの説明をご確認ください。',
      },
      {
        heading: '3. ローカルストレージ',
        body: '素材プランナーの在庫、マップ進捗などのローカルツールは現在のブラウザの localStorage に保存され、アカウントへのクラウド送信は停止しています。ブラウザデータの消去や端末変更でローカル進捗が失われる場合があります。過去のサーバーデータと公開済み共有ビルドは保持されます。ローカル情報はブラウザデータの消去で削除でき、アカウントとサーバーデータの削除は当方へ請求できます。',
      },
      {
        heading: '4. サードパーティサービス',
        body: '当方は以下のサードパーティサービスを利用しています：\n\n• Google Analytics — ウェブサイトトラフィック分析\n• Microsoft Clarity — 利用状況分析・セッション再生ツール\n• Google AdSense — アクセス分析とは別に許可を選択した後で読み込む広告サービス\n• Google ログイン — 過去のアカウント認証（現在停止中）\n• Google Fonts — ウェブフォントレンダリング\n• Cloudflare — ウェブサイトホスティングとCDN\n\nこれらのサービスは IP アドレス、ブラウザ・端末情報を受信し、設定に応じて Cookie 等を使用する場合があります。スクリプトの導入だけでは広告のパーソナライズ、保存期間、同意状況は確定しません。実際の処理はサービス設定、ブラウザ設定、適用要件によって異なります。Google と Microsoft のプライバシーポリシーをご確認ください。',
      },
      {
        heading: '5. データセキュリティ',
        body: 'HTTPS、アクセス制御、制限されたサービス認証情報によりデータを保護します。アカウント情報と利用者コンテンツはサービス提供に必要な期間保存し、セッションと検証記録には有効期限がありますが、物理削除の期限は未検証です。非公開メール gachiawiki@gmail.com（公開GitHub Issueには個人情報を記載しないでください）から個人データの開示・削除を請求できます。',
      },
      {
        heading: '6. 子供のプライバシー',
        body: '本ウェブサイトは13歳未満の子供を対象としておらず、子供から意図的に個人情報を収集することはありません。',
      },
      {
        heading: '7. ポリシーの更新',
        body: '当方は本プライバシーポリシーを随時更新する場合があります。更新されたポリシーは本ページに掲載され、「最終更新」日が更新されます。',
      },
      {
        heading: '8. お問い合わせ',
        body: '本プライバシーポリシーに関するご質問は、GitHub リポジトリに Issue を提出してお問い合わせください。',
      },
    ],
  },
};

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = lang as SupportedLocale;
  const content = CONTENT[locale] ?? CONTENT.en;

  if (!content) return null;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-3xl font-bold text-game-text">{content.title}</h1>
        <p className="mb-8 text-sm text-game-text-muted">
          {locale === 'zh' ? '最后更新：2026年11月14日' : locale === 'ja' ? '最終更新：2026年11月14日' : 'Last Updated: November 14, 2026'}
        </p>

        {content.sections.map((section) => (
          <section key={section.heading} className="mb-6">
            <h2 className="mb-2 text-lg font-semibold text-game-text">{section.heading}</h2>
            <div className="whitespace-pre-line text-sm leading-relaxed text-game-text-muted">
              {section.body}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
