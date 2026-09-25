import { notFound } from 'next/navigation';

export default async function LocaleLayout({ children, params }: Readonly<{ children: React.ReactNode; params: Promise<{ lang: string }> }>) {
  const { lang } = await params;
  if (lang !== 'zh') notFound();
  return children;
}
