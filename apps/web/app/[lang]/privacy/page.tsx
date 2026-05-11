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
        body: '我们使用 Google Analytics 收集匿名访问数据，包括页面浏览量、访问时长、浏览器类型和设备信息。这些数据不包含个人身份信息。我们不收集姓名、邮箱、电话号码等个人身份信息。我们不使用 Cookie 进行广告追踪。',
      },
      {
        heading: '3. 本地存储',
        body: '我们使用浏览器的 localStorage 存储您的偏好设置（如材料规划器中的库存数据）。这些数据仅保存在您的设备上，不会发送到我们的服务器。您可以随时通过清除浏览器数据来删除这些信息。',
      },
      {
        heading: '4. 第三方服务',
        body: '我们使用以下第三方服务：\n\n• Google Analytics — 网站流量分析\n• Google Fonts — 网页字体渲染\n• Cloudflare — 网站托管和 CDN\n\n这些服务可能根据自己的隐私政策收集数据。请参阅各服务的隐私政策了解详情。',
      },
      {
        heading: '5. 数据安全',
        body: '我们通过 Cloudflare 提供的 HTTPS 加密来保护数据传输安全。我们不存储用户的个人数据。',
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
        body: 'We use Google Analytics to collect anonymous usage data, including page views, visit duration, browser type, and device information. This data does not contain personally identifiable information. We do not collect names, email addresses, phone numbers, or other personal identifiers. We do not use cookies for advertising tracking.',
      },
      {
        heading: '3. Local Storage',
        body: 'We use your browser\'s localStorage to store your preferences (such as inventory data in the material planner). This data is stored only on your device and is never sent to our servers. You can delete this data at any time by clearing your browser data.',
      },
      {
        heading: '4. Third-Party Services',
        body: 'We use the following third-party services:\n\n• Google Analytics — website traffic analysis\n• Google Fonts — web font rendering\n• Cloudflare — website hosting and CDN\n\nThese services may collect data according to their own privacy policies. Please refer to each service\'s privacy policy for details.',
      },
      {
        heading: '5. Data Security',
        body: 'We protect data transmission through HTTPS encryption provided by Cloudflare. We do not store personal user data.',
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
        body: '当方は Google Analytics を使用して、ページビュー、訪問時間、ブラウザタイプ、デバイス情報などの匿名利用データを収集しています。このデータには個人を特定できる情報は含まれません。当方は氏名、メールアドレス、電話番号などの個人識別情報を収集しません。当方は広告追跡のために Cookie を使用しません。',
      },
      {
        heading: '3. ローカルストレージ',
        body: '当方はブラウザの localStorage を使用して、お客様の設定（素材プランナーの在庫データなど）を保存します。このデータはお客様のデバイスにのみ保存され、当方のサーバーに送信されることはありません。ブラウザデータをクリアすることで、いつでもこのデータを削除できます。',
      },
      {
        heading: '4. サードパーティサービス',
        body: '当方は以下のサードパーティサービスを利用しています：\n\n• Google Analytics — ウェブサイトトラフィック分析\n• Google Fonts — ウェブフォントレンダリング\n• Cloudflare — ウェブサイトホスティングとCDN\n\nこれらのサービスはそれぞれのプライバシーポリシーに従ってデータを収集する場合があります。',
      },
      {
        heading: '5. データセキュリティ',
        body: '当方は Cloudflare が提供する HTTPS 暗号化によりデータ転送のセキュリティを保護しています。当方はユーザーの個人データを保存しません。',
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
          {locale === 'zh' ? '最后更新：2026年5月11日' : locale === 'ja' ? '最終更新：2026年5月11日' : 'Last Updated: May 11, 2026'}
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
