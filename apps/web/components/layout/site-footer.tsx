import { useTranslations } from 'next-intl';
import type { SupportedLocale } from '@gachia/core';
import { GAMES, GAME_IDS } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';

interface SiteFooterProps {
  locale: SupportedLocale;
}

export function SiteFooter({ locale }: SiteFooterProps) {
  const t = useTranslations('footer');
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-game-border bg-game-surface">
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div>
            <h3 className="mb-2 text-lg font-bold text-game-primary">Gachia</h3>
            <p className="text-sm text-game-text-muted">
              {t('disclaimer')}
            </p>
          </div>

          {/* Games */}
          <div>
            <h4 className="mb-2 font-semibold text-game-text">Games</h4>
            <ul className="space-y-1">
              {GAME_IDS.map((gameId) => (
                <li key={gameId}>
                  <Link
                    href={`/${gameId}` as '/'}
                    className="text-sm text-game-text-muted hover:text-game-primary"
                  >
                    {GAMES[gameId].name[locale]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="mb-2 font-semibold text-game-text">
              {locale === 'zh' ? '资源' : locale === 'ja' ? 'リソース' : 'Resources'}
            </h4>
            <ul className="space-y-1 text-sm">
              <li>
                <Link href="/sitemap" className="text-game-text-muted hover:text-game-primary">
                  {locale === 'zh' ? '网站地图' : locale === 'ja' ? 'サイトマップ' : 'Sitemap'}
                </Link>
              </li>
              <li>
                <Link href="/api" className="text-game-text-muted hover:text-game-primary">
                  API
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-2 font-semibold text-game-text">Legal</h4>
            <ul className="space-y-1 text-sm">
              <li>
                <Link href="/privacy" className="text-game-text-muted hover:text-game-primary">
                  {locale === 'zh' ? '隐私政策' : locale === 'ja' ? 'プライバシーポリシー' : 'Privacy Policy'}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-game-text-muted hover:text-game-primary">
                  {locale === 'zh' ? '服务条款' : locale === 'ja' ? '利用規約' : 'Terms of Service'}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-game-text-muted hover:text-game-primary">
                  {locale === 'zh' ? '联系我们' : locale === 'ja' ? 'お問い合わせ' : 'Contact Us'}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-game-border pt-4 text-center text-sm text-game-text-muted">
          {t('copyright', { year })}
        </div>
      </div>
    </footer>
  );
}
