import { platformMetadata } from '@/lib/platform-metadata';
import type { Metadata } from 'next';
import type { SupportedLocale } from '@gachia/core';

const TITLE: Record<string, string> = { zh: '服务条款', en: 'Terms of Service', ja: '利用規約' };
const DESCRIPTION: Record<string, string> = {
  zh: 'Gachia 服务条款说明网站内容用途、游戏素材版权、用户行为规则、免责声明、第三方链接、服务变更和联系方式。',
  en: 'Gachia Terms of Service explains content usage, game asset ownership, user conduct, disclaimers, third-party links, service changes, and contact options.',
  ja: 'Gachia利用規約では、コンテンツ利用、ゲーム素材の権利、利用者の行動、免責事項、外部リンク、サービス変更、問い合わせ方法を説明します。',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = lang as SupportedLocale;
  return platformMetadata(locale, '/terms', TITLE[locale]!, DESCRIPTION[locale]!);
}

const CONTENT: Record<string, { title: string; sections: { heading: string; body: string }[] }> = {
  zh: {
    title: '服务条款',
    sections: [
      {
        heading: '1. 接受条款',
        body: '使用 Gachia 网站（gachia.com）即表示您同意遵守这些服务条款。如果您不同意这些条款，请勿使用本网站。',
      },
      {
        heading: '2. 服务说明',
        body: 'Gachia 是一个非商业性质的游戏数据百科网站，为原神、崩坏：星穹铁道、鸣潮和无限暖暖等游戏提供角色数据、武器信息、攻略内容等参考资源。本网站按"现状"提供服务，不作任何明示或暗示的保证。',
      },
      {
        heading: '3. 知识产权',
        body: '所有游戏角色、武器、圣遗物及其他游戏素材的版权归原游戏厂商（米哈游/HoYoverse、Kuro Games、Papergames 等）所有。Gachia 仅为数据整理和展示用途使用这些素材，不主张对游戏素材的所有权。\n\nGachia 网站的原创内容（如攻略文章、UI 设计）受版权保护。',
      },
      {
        heading: '4. 用户行为',
        body: '使用本网站时，您同意：\n\n• 不尝试通过自动化手段大规模抓取网站数据\n• 不进行可能损害网站性能的操作\n• 不以误导性方式使用网站内容\n• 遵守适用的法律法规',
      },
      {
        heading: '5. 免责声明',
        body: '本网站提供的数据仅供参考，我们不对数据的准确性、完整性或及时性作出保证。游戏数据可能与实际游戏内容存在差异。对于因使用本网站数据而造成的任何损失，我们不承担责任。',
      },
      {
        heading: '6. 第三方链接',
        body: '本网站可能包含指向第三方网站的链接。我们对这些网站的内容或隐私实践不承担任何责任。',
      },
      {
        heading: '7. 服务变更',
        body: '我们保留随时修改、暂停或终止网站服务（或其任何部分）的权利，无需事先通知。',
      },
      {
        heading: '8. 条款修改',
        body: '我们可能会不时更新本服务条款。继续使用本网站即表示您接受修改后的条款。更新后的条款将在本页面上发布。',
      },
      {
        heading: '9. 联系方式',
        body: '如有关于本服务条款的任何问题，请通过 GitHub 仓库提交 Issue。',
      },
    ],
  },
  en: {
    title: 'Terms of Service',
    sections: [
      {
        heading: '1. Acceptance of Terms',
        body: 'By using the Gachia website (gachia.com), you agree to comply with these Terms of Service. If you do not agree with these terms, please do not use this website.',
      },
      {
        heading: '2. Service Description',
        body: 'Gachia is a non-commercial game data wiki providing reference resources such as character data, weapon information, and guide content for games including Genshin Impact, Honkai: Star Rail, Wuthering Waves, and Infinity Nikki. The service is provided "as is" without any express or implied warranties.',
      },
      {
        heading: '3. Intellectual Property',
        body: 'All game characters, weapons, artifacts, and other game assets are copyrighted by their respective game publishers (miHoYo/HoYoverse, Kuro Games, Papergames, etc.). Gachia uses these assets for data organization and display purposes only and does not claim ownership of game assets.\n\nOriginal content on Gachia (such as guide articles and UI design) is protected by copyright.',
      },
      {
        heading: '4. User Conduct',
        body: 'When using this website, you agree to:\n\n• Not attempt to scrape website data at scale through automated means\n• Not perform actions that may impair website performance\n• Not use website content in a misleading manner\n• Comply with applicable laws and regulations',
      },
      {
        heading: '5. Disclaimer',
        body: 'The data provided on this website is for reference only. We do not guarantee the accuracy, completeness, or timeliness of the data. Game data may differ from actual game content. We are not liable for any losses resulting from the use of data on this website.',
      },
      {
        heading: '6. Third-Party Links',
        body: 'This website may contain links to third-party websites. We are not responsible for the content or privacy practices of those websites.',
      },
      {
        heading: '7. Service Modifications',
        body: 'We reserve the right to modify, suspend, or discontinue the website service (or any part thereof) at any time without prior notice.',
      },
      {
        heading: '8. Changes to Terms',
        body: 'We may update these Terms of Service from time to time. Continued use of the website constitutes acceptance of the modified terms. Updated terms will be posted on this page.',
      },
      {
        heading: '9. Contact',
        body: 'For any questions about these Terms of Service, please submit an Issue on our GitHub repository.',
      },
    ],
  },
  ja: {
    title: '利用規約',
    sections: [
      {
        heading: '1. 規約の承諾',
        body: 'Gachia ウェブサイト（gachia.com）を利用することにより、本利用規約に従うことに同意したものとみなされます。本規約に同意しない場合は、本ウェブサイトをご利用くださいません。',
      },
      {
        heading: '2. サービスの説明',
        body: 'Gachia は非商業的なゲームデータ百科サイトであり、原神、崩壊：スターレイル、鳴潮、無限ニキなどのゲームのキャラクターデータ、武器情報、ガイドコンテンツなどの参考リソースを提供しています。本サービスは現状有姿で提供され、明示または黙示のいかなる保証もありません。',
      },
      {
        heading: '3. 知的財産権',
        body: 'すべてのゲームキャラクター、武器、聖遺物およびその他のゲーム素材の著作権は、各ゲームメーカー（miHoYo/HoYoverse、Kuro Games、Papergames 等）に帰属します。Gachia はこれらの素材をデータ整理と表示の目的でのみ使用しており、ゲーム素材の所有権を主張するものではありません。\n\nGachia のオリジナルコンテンツ（ガイド記事や UI デザインなど）は著作権により保護されています。',
      },
      {
        heading: '4. ユーザーの行動',
        body: '本ウェブサイトを利用する際、以下に同意するものとします：\n\n• 自動化された手段による大規模なデータスクレイピングを行わない\n• ウェブサイトのパフォーマンスを損なう可能性のある操作を行わない\n• ウェブサイトのコンテンツを誤解を招く方法で使用しない\n• 適用される法律と規制を遵守する',
      },
      {
        heading: '5. 免責事項',
        body: '本ウェブサイトで提供されるデータは参考用です。データの正確性、完全性、適時性を保証するものではありません。ゲームデータは実際のゲーム内容と異なる場合があります。本ウェブサイトのデータの使用によって生じた損失について、当方は責任を負いません。',
      },
      {
        heading: '6. サードパーティリンク',
        body: '本ウェブサイトにはサードパーティウェブサイトへのリンクが含まれる場合があります。当方はこれらのウェブサイトの内容またはプライバシー慣行について責任を負いません。',
      },
      {
        heading: '7. サービスの変更',
        body: '当方は事前の通知なく、いつでもウェブサイトサービス（またはその一部）を変更、一時停止、または終了する権利を留保します。',
      },
      {
        heading: '8. 規約の変更',
        body: '当方は本利用規約を随時更新する場合があります。本ウェブサイトの継続利用により、変更された規約に同意したものとみなされます。更新された規約は本ページに掲載されます。',
      },
      {
        heading: '9. お問い合わせ',
        body: '本利用規約に関するご質問は、GitHub リポジトリに Issue を提出してお問い合わせください。',
      },
    ],
  },
};

export default async function TermsPage({
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
