import Link from 'next/link';
import { characters, characterName, kibo } from '@/lib/data';
import { asLocale, localize } from '@/lib/i18n';
import { metadata, url } from '@/lib/seo';
import { GameNav } from '@/components/game-nav';
import { CharacterFilter } from '@/components/character-filter';
import { CharacterCompare } from '@/components/character-compare';
import { CharacterKiboMatch } from '@/components/character-kibo-match';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const locale = asLocale((await params).lang);
  const title = localize(locale, { zh: '蓝色星原：旅谣角色图鉴', en: 'Azur Promilia Characters', ja: 'アズールプロミリア キャラクター' });
  return metadata(locale, title, localize(locale, { zh: '官方角色设定与明确标注的 CBT 战斗参考资料。', en: 'Official character profiles and clearly labeled CBT combat references.', ja: '公式キャラクター設定と、明確に区別したCBT戦闘リファレンス。' }), 'characters');
}

export default async function Characters({ params }: { params: Promise<{ lang: string }> }) {
  const locale = asLocale((await params).lang);
  const title = localize(locale, { zh: '角色图鉴', en: 'Characters', ja: 'キャラクター' });
  return <>
    <GameNav locale={locale} current="characters" />
    <main className="content">
      <h1>{title}</h1>
      <p className="card__meta">{localize(locale, { zh: '来源：日本官方角色页，以及 GameWith CBT 角色索引（均于 2026-09-10 核对）', en: 'Sources: Japanese official character pages and the GameWith CBT character index (checked 2026-09-10)', ja: '出典：日本公式キャラクターページおよびGameWith CBTキャラクター索引（いずれも2026-09-10確認）' })}</p>
      <p className="notice">{localize(locale, { zh: '元素、职业、稀有度、战斗类型、调谐印记与技能摘要来自 CBT/Beta 公开参考，正式版本可能变更；本站不会据此制作正式 Tier List。', en: 'Elements, professions, rarity, battle types, Tuning Marks, and skill summaries are public CBT/Beta references and may change at release. They are not used for a formal tier list.', ja: '属性、職業、レアリティ、戦闘タイプ、調律マーク、スキル概要は公開CBT/Betaリファレンスであり、正式版では変更される場合があります。正式Tier Listには使用しません。' })}</p>
      <CharacterFilter characters={characters} locale={locale} />
      <CharacterCompare characters={characters} locale={locale} />
      <CharacterKiboMatch characters={characters} kibo={kibo} locale={locale} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, url: url(locale, 'characters') }) }} />
    </main>
  </>;
}
