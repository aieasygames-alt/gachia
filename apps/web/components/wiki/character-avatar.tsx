'use client';

import { useState } from 'react';

const ELEMENT_COLORS: Record<string, string> = {
  pyro: '#ef4444', hydro: '#3b82f6', electro: '#8b5cf6',
  cryo: '#67e8f9', dendro: '#4ade80', anemo: '#6ee7b7', geo: '#fbbf24',
  anima: '#4ade80', chaos: '#8b5cf6', cosmos: '#3b82f6',
  incantation: '#f59e0b', lakshana: '#ec4899', psyche: '#06b6d4',
  // Roco Kingdom elements
  grass: '#4ade80', fire: '#ef4444', water: '#3b82f6', normal: '#9ca3af',
  // ZZZ elements
  Physical: '#9ca3af', Fire: '#ef4444', Ice: '#67e8f9',
  Electric: '#8b5cf6', Ether: '#ec4899',
};

interface CharacterAvatarProps {
  src: string;
  alt: string;
  element?: string;
  className?: string;
}

export function CharacterAvatar({ src, alt, element, className }: CharacterAvatarProps) {
  const [failed, setFailed] = useState(false);
  const bgColor = (element && ELEMENT_COLORS[element]) || '#6b7280';

  if (failed) {
    return (
      <div
        className={className}
        style={{
          background: `linear-gradient(135deg, ${bgColor}33, ${bgColor}11)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: bgColor,
          fontWeight: 700,
          fontSize: 'inherit',
        }}
      >
        {alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
