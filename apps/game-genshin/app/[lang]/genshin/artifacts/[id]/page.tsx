import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GameNav } from '@/components/game-nav';
import { artifactSets, getArtifactSetById, getArtifactSetDesc2pc, getArtifactSetDesc4pc, getArtifactSetName, genshinCharacterSummaries, getGenshinCharacterSummaryName } from '@/lib/data';
import { asLocale, text } from '@/lib/i18n';
import { genshinMetadata } from '@/lib/seo';

export async function generateStaticParams() { return ['zh', 'en', 'ja'].flatMap((lang) => artifactSets.map((set) => ({ lang, id: set.id }))); }
export async function generateMetadata({ params }: { params: Promise<{ lang: string; id: string }> }) { const { lang, id } = await params; const locale = asLocale(lang); const set = getArtifactSetById(id); return set ? genshinMetadata(locale, `artifacts/${id}`, `${getArtifactSetName(set, locale)} - Genshin Impact`, getArtifactSetDesc2pc(set, locale)) : {}; }
export default async function ArtifactDetail({ params }: { params: Promise<{ lang: string; id: string }> }) { const { lang, id } = await params; const locale = asLocale(lang); const set = getArtifactSetById(id); if (!set) notFound(); const name = getArtifactSetName(set, locale); const characters = genshinCharacterSummaries.filter((character) => set.bestFor.includes(character.id)); return <><GameNav locale={locale} current="artifacts"/><main className="content article"><Link className="back" href={`/${locale}/genshin/artifacts`}>{text(locale, { zh: '返回圣遗物', en: 'Back to artifacts', ja: '聖遺物一覧に戻る' })}</Link><h1>{name}</h1><h2>2pc</h2><p>{getArtifactSetDesc2pc(set, locale)}</p><h2>4pc</h2><p>{getArtifactSetDesc4pc(set, locale)}</p>{characters.length > 0 && <section><h2>{text(locale, { zh: '适配角色', en: 'Best characters', ja: '適性キャラクター' })}</h2><div className="grid">{characters.map((character) => <Link className="card" key={character.id} href={`/${locale}/genshin/characters/${character.id}`}>{getGenshinCharacterSummaryName(character, locale)}</Link>)}</div></section>}</main></>; }
