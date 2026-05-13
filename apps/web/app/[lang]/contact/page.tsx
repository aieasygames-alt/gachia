import type { Metadata } from 'next';
import type { SupportedLocale } from '@gachia/core';

const TITLE: Record<string, string> = { zh: '联系我们', en: 'Contact Us', ja: 'お問い合わせ' };

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
    title: '联系我们',
    sections: [
      {
        heading: '电子邮件',
        body: '如果您有任何问题、建议或合作意向，欢迎通过电子邮件联系我们：\n\ngachiawiki@gmail.com',
      },
      {
        heading: 'GitHub',
        body: '您也可以通过我们的 GitHub 仓库提交 Issue 来反馈问题或建议。',
      },
      {
        heading: '回复时间',
        body: '我们会在收到邮件后尽快回复，通常在 1-3 个工作日内。',
      },
    ],
  },
  en: {
    title: 'Contact Us',
    sections: [
      {
        heading: 'Email',
        body: 'If you have any questions, suggestions, or partnership inquiries, feel free to reach out via email:\n\ngachiawiki@gmail.com',
      },
      {
        heading: 'GitHub',
        body: 'You can also submit an Issue on our GitHub repository to report bugs or suggest features.',
      },
      {
        heading: 'Response Time',
        body: 'We will respond to your email as soon as possible, typically within 1-3 business days.',
      },
    ],
  },
  ja: {
    title: 'お問い合わせ',
    sections: [
      {
        heading: 'メール',
        body: 'ご質問、ご提案、パートナーシップのお問い合わせなどございましたら、メールにてご連絡ください：\n\ngachiawiki@gmail.com',
      },
      {
        heading: 'GitHub',
        body: 'GitHub リポジトリに Issue を提出して、バグの報告や機能の提案を行うこともできます。',
      },
      {
        heading: '返信時間',
        body: 'メールを受け取り次第、できるだけ早く返信いたします。通常は1〜3営業日以内です。',
      },
    ],
  },
};

export default async function ContactPage({
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
        <h1 className="mb-8 text-3xl font-bold text-game-text">{content.title}</h1>

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
