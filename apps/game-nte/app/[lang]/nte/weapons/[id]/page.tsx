import type { SupportedLocale } from '@gachia/core';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNteWeaponName, nteWeapons } from '@/lib/data';
import { NteNav } from '@/components/nte-nav';
import { previewMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  const locale = lang as SupportedLocale;
  const weapon = nteWeapons.find((item) => item.id === id);
  if (!weapon) return {};
  const name = getNteWeaponName(weapon, locale);
  const description = locale === 'zh' ? `${name} 的类型、基础攻击与效果说明。` : locale === 'ja' ? `${name}の種類・基礎攻撃・効果。` : `${name} type, base attack, and effect reference.`;
  return previewMetadata(`${name} — NTE`, description, locale, `/weapons/${id}`);
}

export default async function WeaponDetail({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  const locale = lang as SupportedLocale;
  const weapon = nteWeapons.find((item) => item.id === id);
  if (!weapon) notFound();
  const name = getNteWeaponName(weapon, locale);
  const effect = locale === 'zh' ? weapon.effectDescription ?? weapon.effectDescriptionEn : weapon.effectDescriptionEn ?? weapon.effectDescription ?? '';
  return <><NteNav locale={locale} current="weapons"/><main className="content article"><Link className="back" href={`/${locale}/nte/weapons`}>{locale === 'zh' ? '返回武器图鉴' : locale === 'ja' ? '武器図鑑に戻る' : 'Back to weapons'}</Link><div className="eyebrow">NTE Weapon</div><h1>{name}</h1><section className="facts"><div><span>{locale === 'zh' ? '稀有度' : locale === 'ja' ? 'レアリティ' : 'Rank'}</span><strong>{weapon.rank ?? '-'}</strong></div><div><span>{locale === 'zh' ? '类型' : locale === 'ja' ? 'タイプ' : 'Type'}</span><strong>{weapon.type ?? '-'}</strong></div><div><span>{locale === 'zh' ? '基础攻击' : locale === 'ja' ? '基礎攻撃' : 'Base ATK'}</span><strong>{weapon.baseAtk ?? '-'}</strong></div><div><span>{locale === 'zh' ? '资料状态' : locale === 'ja' ? 'データ状態' : 'Data status'}</span><strong>{locale === 'zh' ? '预览资料' : locale === 'ja' ? 'プレビューデータ' : 'Preview data'}</strong></div></section><div className="card"><div className="card__title">{locale === 'zh' ? '武器效果' : locale === 'ja' ? '武器効果' : 'Weapon effect'}</div><p>{effect || (locale === 'zh' ? '该武器的效果说明尚未收录。' : locale === 'ja' ? 'この武器の効果説明はまだ収録されていません。' : 'No effect description is available yet.')}</p></div><div className="link-list"><Link href={`/${locale}/nte/characters`}>{locale === 'zh' ? '角色图鉴' : locale === 'ja' ? 'キャラクター図鑑' : 'Characters'}</Link><Link href={`/${locale}/nte/build`}>{locale === 'zh' ? '配装参考' : locale === 'ja' ? 'ビルド' : 'Builds'}</Link><Link href={`/${locale}/nte/items`}>{locale === 'zh' ? '养成材料' : locale === 'ja' ? '育成素材' : 'Materials'}</Link></div></main></>;
}
