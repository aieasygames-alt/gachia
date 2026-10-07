const htmlLanguages: Record<string, string> = { zh: 'zh-Hans', en: 'en', ja: 'ja' };

export const revalidate = 3600;

export default async function LocaleLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ lang: string }> }>) {
  const { lang } = await params;
  return <html lang={htmlLanguages[lang] ?? 'zh-Hans'}><body><div className="page-shell">{children}</div></body></html>;
}
