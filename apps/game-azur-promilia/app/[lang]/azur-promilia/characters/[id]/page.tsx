import { notFound } from 'next/navigation';
import Link from 'next/link';
import { characters, characterName } from '@/lib/data';
import { asLocale, localize } from '@/lib/i18n';
import { metadata, url } from '@/lib/seo';
import { GameNav } from '@/components/game-nav';

export async function generateMetadata({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  const locale = asLocale(lang);
  const character = characters.find((entry) => entry.id === id);
  return character ? metadata(locale, `${characterName(character, locale)} | Azur Promilia`, character.description[locale], `characters/${id}`) : {};
}

export default async function CharacterDetail({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  const locale = asLocale(lang);
  const character = characters.find((entry) => entry.id === id);
  if (!character) notFound();
  const name = characterName(character, locale);
  const { beta } = character;
  return <>
    <GameNav locale={locale} current="characters" />
    <main className="content article">
      <Link className="back" href={`/${locale}/azur-promilia/characters`}>{localize(locale, { zh: '返回角色图鉴', en: 'Back to characters', ja: 'キャラクター一覧に戻る' })}</Link>
      <h1>{name}</h1>
      <p className="notice">{localize(locale, { zh: '以下战斗资料为 CBT/Beta 公开参考，并非正式版本承诺；上线后会以官方说明为准更新。', en: 'The combat details below are public CBT/Beta references, not release commitments. Official release information will take precedence.', ja: '以下の戦闘情報は公開CBT/Betaの参照情報であり、正式版の保証ではありません。配信後は公式情報を優先して更新します。' })}</p>
      <div className="facts">
        <div><span>{localize(locale, { zh: '元素', en: 'Element', ja: '属性' })}</span><strong>{beta.element}</strong></div>
        <div><span>{localize(locale, { zh: '稀有度', en: 'Rarity', ja: 'レアリティ' })}</span><strong>{beta.rarity}★</strong></div>
        <div><span>{localize(locale, { zh: '职业', en: 'Profession', ja: '職業' })}</span><strong>{beta.profession}</strong></div>
        <div><span>{localize(locale, { zh: '武器', en: 'Weapon', ja: '武器' })}</span><strong>{beta.weaponType}</strong></div>
        <div><span>{localize(locale, { zh: '地区', en: 'Region', ja: '地域' })}</span><strong>{beta.region}</strong></div>
        <div><span>{localize(locale, { zh: '测试版本', en: 'Test Version', ja: 'テスト版' })}</span><strong>{beta.cbtVersion}</strong></div>
      </div>
      <p className="lead">{character.description[locale]}</p>
      <section>
        <h2>{localize(locale, { zh: '战斗类型', en: 'Battle Types', ja: '戦闘タイプ' })}</h2>
        <div className="chip-row">{beta.battleTypes.map((type) => <span className="chip" key={type}>{type}</span>)}</div>
      </section>
      <section>
        <h2>{localize(locale, { zh: '调谐印记', en: 'Tuning Marks', ja: '調律マーク' })}</h2>
        <div className="tuning-grid">
          <div><span>{localize(locale, { zh: '获得', en: 'Gain', ja: '獲得' })}</span><strong>{beta.tuningMarks.gains.join(', ') || localize(locale, { zh: '索引未说明', en: 'Not specified in the index', ja: '索引に記載なし' })}</strong></div>
          <div><span>{localize(locale, { zh: '消耗', en: 'Consume', ja: '消費' })}</span><strong>{beta.tuningMarks.consumes.join(', ') || localize(locale, { zh: '索引未说明', en: 'Not specified in the index', ja: '索引に記載なし' })}</strong></div>
          <div><span>{localize(locale, { zh: '条件', en: 'Requirement', ja: '条件' })}</span><strong>{beta.tuningMarks.requires.join(', ') || localize(locale, { zh: '无额外条件', en: 'No extra requirement', ja: '追加条件なし' })}</strong></div>
        </div>
      </section>
      <section>
        <h2>{localize(locale, { zh: '技能摘要', en: 'Skill Summaries', ja: 'スキル概要' })}</h2>
        <div className="skill-list">{beta.skills.map((entry) => <article className="skill" key={entry.id}><div className="skill__category">{({ normal: localize(locale, { zh: '普通攻击', en: 'Normal', ja: '通常' }), resonance: localize(locale, { zh: '共鸣技', en: 'Resonance', ja: '共鳴' }), decision: localize(locale, { zh: '决断技', en: 'Decision', ja: '決断' }), companion: localize(locale, { zh: '同伴技', en: 'Companion', ja: '同伴' }), blessing: localize(locale, { zh: '祝福', en: 'Blessing', ja: '祝福' }), reference: localize(locale, { zh: '参考', en: 'Reference', ja: '参照' }) })[entry.category]}</div><h3>{entry.name[locale]}</h3><p>{entry.description[locale]}</p>{(entry.cooldown || entry.energyCost) && <p className="card__meta">{[entry.cooldown && `${localize(locale, { zh: '冷却', en: 'Cooldown', ja: 'クールダウン' })}: ${entry.cooldown}`, entry.energyCost && `${localize(locale, { zh: '能量', en: 'Energy', ja: 'エネルギー' })}: ${entry.energyCost}`].filter(Boolean).join(' · ')}</p>}</article>)}</div>
      </section>
      <p className="source-line">{localize(locale, { zh: '战斗资料来源：', en: 'Combat data source: ', ja: '戦闘データの出典：' })}<a href={beta.source.url} rel="noreferrer" target="_blank">{beta.source.name}</a> ({beta.source.checkedAt})</p>
      {character.officialSource && <p className="source-line">{localize(locale, { zh: '官方人物设定来源：', en: 'Official profile source: ', ja: '公式プロフィール出典：' })}<a href={character.officialSource.url} rel="noreferrer" target="_blank">{character.officialSource.name}</a></p>}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Person', name, description: character.description[locale], url: url(locale, `characters/${id}`) }) }} />
    </main>
  </>;
}
