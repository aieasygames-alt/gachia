import { getD1 } from './db';
import { readStarRailUpdates, type UpdateResult } from '@gachia/data/cms/starrail-client';
import { parseStarRailPublication, type StarRailPublication } from '@gachia/data/cms/starrail-publication';
import type { UpdateLocale } from '@gachia/data/cms/starrail-updates';
import { connection } from 'next/server';

export async function getStarRailPublication(): Promise<StarRailPublication | null> {
  const row = await getD1().prepare('SELECT payload FROM cms_starrail_publication WHERE id = 1').first<{ payload: string }>();
  return row ? parseStarRailPublication(JSON.parse(row.payload)) : null;
}

export async function loadStarRailUpdates(locale: UpdateLocale): Promise<UpdateResult> {
  // This page must read the publication at request time, including after withdrawal.
  await connection();
  if (process.env.PAYLOAD_CMS_URL) return readStarRailUpdates(locale, process.env.PAYLOAD_CMS_URL);
  try {
    const publication = await getStarRailPublication();
    if (publication) return { source: 'cms', updates: publication.docs.filter(doc => doc.locale === locale) };
  } catch {
    console.error(JSON.stringify({ event: 'starrail_publication_unavailable' }));
  }
  return readStarRailUpdates(locale);
}
