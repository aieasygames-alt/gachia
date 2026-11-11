export function characterIds(value) {
  if (!Array.isArray(value)) throw new Error('Expected an array');
  return value.flatMap(entry => typeof entry?.id === 'string' ? [entry.id] : []);
}

export function searchProjection(raw, locale) {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap(entry => {
    if (typeof entry?.id !== 'string') return [];
    const name = locale === 'zh' ? entry.name : locale === 'ja' ? (entry.nameJa ?? entry.nameEn ?? entry.name) : (entry.nameEn ?? entry.name);
    const nameAlt = locale === 'zh' ? (entry.nameEn ?? '') : entry.name;
    return typeof name === 'string' ? [{ id: entry.id, name, nameAlt }] : [];
  });
}

export function tierListProjection(raw, game, fields) {
  return raw.filter(entry => entry?.status !== 'upcoming' && typeof entry?.id === 'string').map(entry => {
    const result = { id: entry.id, name: entry.name, nameEn: entry.nameEn, nameJa: entry.nameJa,
      image: entry.image || `/images/${game}/characters/${entry.id}.webp`, rarity: entry.rarity, tierRank: entry.tierRank };
    for (const field of fields) result[field] = entry[field];
    if (game === 'wuwa') result.tierReason = entry.tierReason;
    return result;
  });
}

export function genshinPlatformProjection(characters, guides, codes) {
  const localized = (zh, en, ja) => ({ zh, en: en || zh, ja: ja || en || zh });
  return {
    characters: characters.filter(entry => entry.status !== 'upcoming').map(entry => ({
      id: entry.id, name: localized(entry.name, entry.nameEn, entry.nameJa),
      imageUrl: entry.image?.startsWith('/images/') ? `https://img.gachia.com${entry.image}`
        : entry.image || `https://img.gachia.com/images/genshin/characters/${entry.id}.webp`,
      imageAlt: entry.nameEn || entry.name, element: entry.element, rarity: entry.rarity,
    })),
    guides: guides.map(entry => ({ id: entry.id, title: localized(entry.title, entry.titleEn, entry.titleJa),
      summary: localized(entry.summary, entry.summaryEn, entry.summaryJa), updatedAt: entry.updatedAt })),
    codes: codes.map(({ code, status, expiresAt, revealedAt }) => ({ code, status, expiresAt, revealedAt })),
  };
}
