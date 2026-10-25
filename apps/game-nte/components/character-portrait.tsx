import type { SupportedLocale } from '@gachia/core';
import { characterImage } from '../lib/character-media';

export function CharacterPortrait({ id, name, locale, className, decorative = false }: {
  id: string; name: string; locale: SupportedLocale; className: string; decorative?: boolean;
}) {
  const src = characterImage({ id });
  if (src) return <img className={className} src={src} alt={decorative ? '' : name} width={240} height={240} loading={decorative ? 'lazy' : undefined} />;
  const label = locale === 'zh' ? '暂无经核验的角色肖像' : locale === 'ja' ? '確認済みのキャラクター画像はありません' : 'No verified character portrait available';
  return <div className={`${className} portrait-placeholder`} data-portrait-unavailable={id} role="img" aria-label={`${name}: ${label}`}><span aria-hidden="true">{name.slice(0, 1)}</span><small aria-hidden="true">{label}</small></div>;
}
