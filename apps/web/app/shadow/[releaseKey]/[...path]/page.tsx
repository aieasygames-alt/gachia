import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readOwnerShadowRequest } from '@/lib/shadow-reader';
import { shadowDocument } from '../../../../../../packages/core/shadow-local-reader';
import { serializeJsonLd } from '@/lib/jsonld-script';

type Props = { params: Promise<{ releaseKey: string; path: string[] }> };
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function read(params: Props['params']) {
  const { releaseKey, path } = await params;
  const context = await readOwnerShadowRequest(releaseKey);
  const pathname = '/' + path.join('/');
  if (!context.entries.some(entry => entry.path === pathname)) notFound();
  const content = shadowDocument(context, pathname);
  if (!content) notFound();
  return { context, ...content };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { context, metadata } = await read(params);
  return { title: { absolute: metadata.title }, openGraph: null, twitter: null, description: 'Local synthetic shadow acceptance; not published content.',
    robots: { index: false, follow: false },
    other: { 'x-shadow-release': context.releaseKey, 'x-shadow-context': context.contextId, 'x-shadow-cache-key': metadata.cacheKey } };
}

export default async function ShadowPage({ params }: Props) {
  const { context, document, jsonLd } = await read(params);
  return <main data-shadow-context={context.contextId} data-shadow-release={context.releaseKey} data-shadow-owner={context.owner}
    data-shadow-cache-key={document.cacheKey} data-shadow-artifact-reads={context.reads}>
    <p>Local synthetic fixture. Not published. No third-party media approval.</p>
    <h1>{document.title}</h1><p data-shadow-body>{document.body}</p>
    <img src={context.mediaPath} alt="Synthetic fixture" width={480} height={80}/>
    <nav aria-label="Same-release shadow pages">{context.entries.filter(entry => entry.path !== document.path).map(entry =>
      <Link key={entry.path} href={`${context.prefix}${entry.path}`} prefetch={true} data-shadow-navigation>{entry.title}</Link>)}</nav>
    <a href={`${context.prefix}/sitemap.xml`}>Shadow sitemap</a>
    <script data-shadow-context={context.contextId} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}/>
  </main>;
}
