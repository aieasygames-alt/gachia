import type { Metadata } from 'next';
import type { SupportedLocale } from '@gachia/core';

const TITLE: Record<string, string> = { zh: '隐私政策', en: 'Privacy Policy', ja: 'プライバシーポリシー' };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = lang as SupportedLocale;
  return { title: TITLE[locale] };
}

const CONTENT: Record<string, { title: string; sections: { heading: string; body: string }[] }> = {
  zh: {
    title: '隐私政策',
    sections: [
      {
        heading: '1. 概述',
        body: 'Gachia（"我们"）尊重您的隐私。本隐私政策说明我们如何收集、使用和保护您的个人信息。使用本网站即表示您同意本政策。',
      },
      {
        heading: '2. 信息收集',
        body: '我们使用 Google Analytics 收集访问数据，包括页面浏览量、访问时长、浏览器类型和设备信息。使用 Google 登录时，我们会从 Google 获取并存储您的姓名、邮箱地址、头像和账号标识。我们还会处理会话令牌、IP 地址、User-Agent，以及您主动保存的收藏、角色、地图进度和共享配装。我们不使用这些信息进行广告追踪。',
      },
      {
        heading: '3. 本地存储',
        body: '材料规划器库存等未启用同步的偏好保存在浏览器 localStorage 中。登录后主动使用收藏、角色、地图进度或共享功能时，相应数据会发送并保存在我们的服务器。您可以清除浏览器数据来删除本地信息，并通过联系我们请求删除账号及服务器数据。',
      },
      {
        heading: '4. 第三方服务',
        body: '我们使用以下第三方服务：\n\n• Google Analytics — 网站流量分析\n• Google Fonts — 网页字体渲染\n• Cloudflare — 网站托管和 CDN\n\n这些服务可能根据自己的隐私政策收集数据。请参阅各服务的隐私政策了解详情。',
      },
      {
        heading: '5. 数据安全',
        body: '我们通过 HTTPS、访问控制和受限的服务密钥保护数据。账号与用户内容会在提供服务所需期间保存；会话和验证记录按其有效期保存。您可以通过 GitHub Issue 或联系邮箱请求访问或删除个人数据。',
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
      {
        heading: '1. Overview',
        body: 'Gachia ("we") respects your privacy. This Privacy Policy explains how we collect, use, and protect your information. By using this website, you agree to this policy.',
      },
      {
        heading: '2. Information Collection',
        body: 'We use Google Analytics to collect usage data such as page views, visit duration, browser type, and device information. When you sign in with Google, we receive and store your name, email address, profile image, and account identifier. We also process session tokens, IP addresses, user agents, and information you choose to save, including favorites, characters, map progress, and shared builds. We do not use this information for advertising tracking.',
      },
      {
        heading: '3. Local Storage',
        body: 'Preferences that are not synchronized, such as material planner inventory, are stored in your browser\'s localStorage. When signed in, data you intentionally save through favorites, characters, map progress, or sharing features is sent to and stored on our servers. You can clear browser data to remove local information and contact us to request deletion of your account and server data.',
      },
      {
        heading: '4. Third-Party Services',
        body: 'We use the following third-party services:\n\n• Google Analytics — website traffic analysis\n• Google Fonts — web font rendering\n• Cloudflare — website hosting and CDN\n\nThese services may collect data according to their own privacy policies. Please refer to each service\'s privacy policy for details.',
      },
      {
        heading: '5. Data Security',
        body: 'We protect data using HTTPS, access controls, and restricted service credentials. Account information and user content are retained while needed to provide the service; sessions and verification records are retained for their validity period. You may request access to or deletion of personal data through a GitHub Issue or the contact email.',
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
      {
        heading: '1. 概要',
        body: 'Gachia（以下「当方」）は、お客様のプライバシーを尊重いたします。本プライバシーポリシーは、お客様の情報の収集、使用、保護について説明するものです。本ウェブサイトを利用することにより、本ポリシーに同意したものとみなされます。',
      },
      {
        heading: '2. 情報収集',
        body: 'Google Analytics を使用し、ページビュー、訪問時間、ブラウザタイプ、デバイス情報などの利用データを収集します。Google でログインすると、氏名、メールアドレス、プロフィール画像、アカウント識別子を取得して保存します。また、セッショントークン、IP アドレス、User-Agent、およびお気に入り、キャラクター、マップ進捗、共有ビルドなど利用者が保存した情報を処理します。これらを広告追跡には使用しません。',
      },
      {
        heading: '3. ローカルストレージ',
        body: '同期されない素材プランナーの在庫などはブラウザの localStorage に保存されます。ログイン後にお気に入り、キャラクター、マップ進捗、共有機能で保存したデータはサーバーへ送信され保存されます。ローカル情報はブラウザデータの消去で削除でき、アカウントとサーバーデータの削除は当方へ請求できます。',
      },
      {
        heading: '4. サードパーティサービス',
        body: '当方は以下のサードパーティサービスを利用しています：\n\n• Google Analytics — ウェブサイトトラフィック分析\n• Google Fonts — ウェブフォントレンダリング\n• Cloudflare — ウェブサイトホスティングとCDN\n\nこれらのサービスはそれぞれのプライバシーポリシーに従ってデータを収集する場合があります。',
      },
      {
        heading: '5. データセキュリティ',
        body: 'HTTPS、アクセス制御、制限されたサービス認証情報によりデータを保護します。アカウント情報と利用者コンテンツはサービス提供に必要な期間保存し、セッションと検証記録は有効期間中保存します。GitHub Issue または連絡先メールから個人データの開示・削除を請求できます。',
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
          {locale === 'zh' ? '最后更新：2026年7月11日' : locale === 'ja' ? '最終更新：2026年7月11日' : 'Last Updated: July 11, 2026'}
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
