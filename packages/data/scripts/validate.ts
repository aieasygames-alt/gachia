import { CharacterSchema, WeaponSchema, ItemSchema, TierListSchema } from '@gachia/core';
import { getGameData } from '../index';
import { GAME_IDS } from '@gachia/core';

async function validate() {
  let errors = 0;

  for (const gameId of GAME_IDS) {
    // CRITICAL FIX: Add await - getGameData returns a Promise
    const data = await getGameData(gameId);

    for (const char of data.characters) {
      const result = CharacterSchema.safeParse(char);
      if (!result.success) {
        console.error(`[${gameId}] Invalid character ${char.id}:`, result.error.flatten());
        // Only show full data for first error to reduce noise
        if (errors === 0) {
          console.error(`Character data:`, JSON.stringify(char, null, 2));
        }
        errors++;
      }
    }

    for (const weapon of data.weapons) {
      const result = WeaponSchema.safeParse(weapon);
      if (!result.success) {
        console.error(`[${gameId}] Invalid weapon ${weapon.id}:`, result.error.flatten());
        errors++;
      }
    }

    for (const item of data.items) {
      const result = ItemSchema.safeParse(item);
      if (!result.success) {
        console.error(`[${gameId}] Invalid item ${item.id}:`, result.error.flatten());
        errors++;
      }
    }

    for (const tl of data.tierLists) {
      const result = TierListSchema.safeParse(tl);
      if (!result.success) {
        console.error(`[${gameId}] Invalid tier list:`, result.error.flatten());
        errors++;
      }
    }
  }

  if (errors > 0) {
    console.error(`\n${errors} validation error(s) found.`);
    process.exit(1);
  } else {
    console.log('All data validated successfully.');
  }
}

// CRITICAL FIX: Call async function
validate();
