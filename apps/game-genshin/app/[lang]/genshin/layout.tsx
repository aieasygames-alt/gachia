import { GameNav } from '@/components/game-nav';
import { asLocale } from '@/lib/i18n';

export default async function GenshinLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ lang: string }> }>) {
  const { lang } = await params;
  const locale = asLocale(lang);
  return <>{children}<footer className="site-footer">Gachia is an independent game information site.</footer></>;
}
