// No verified Chaos portrait is available. Do not request the known missing asset
// or silently substitute another character's artwork.
export function characterImage(character: { id: string }): string | null {
  return character.id === 'chaos' ? null : `/images/characters/${character.id}.webp`;
}
