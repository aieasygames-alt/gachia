import { cache } from 'react';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { loadLocalShadow } from '../../../packages/core/shadow-local-reader';
import { shadowLocalEnabled } from '../../../packages/core/shadow-local-gate';

// React cache shares one verified consumer between metadata and the server page,
// but never retains it across requests or silently falls back after an outage.
export const readOwnerShadowRequest = cache(async (releaseKey: string) => {
  const host = (await headers()).get('host');
  if (!shadowLocalEnabled('genshin', host)) notFound();
  return loadLocalShadow('genshin', releaseKey, host);
});
