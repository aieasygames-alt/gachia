import { describe, expect, it } from 'vitest';
import { getAniimoCharacterById } from '@gachia/data/games/aniimo/characters';
import { isAniimoCharacterIndexable } from '../lib/seo-metadata';

describe('Aniimo character indexing', () => {
  it('does not index entries that are still based on pre-launch source tracking', () => {
    const eklue = getAniimoCharacterById('eklue');

    expect(eklue).toBeDefined();
    for (const locale of ['zh', 'en', 'ja'] as const) {
      expect(isAniimoCharacterIndexable(eklue, locale)).toBe(false);
    }
  });

  it('requires verified, independently useful localized details before indexing', () => {
    const entry = {
      status: 'Verified',
      description: '这是经过实机验证的中文角色说明，包含足够的独特资料来帮助玩家理解角色的定位、技能循环、常见队伍用途以及在不同战斗场景下的实际使用方式。',
      descriptionEn: 'This is a verified English character profile with enough original details to explain the character role and practical uses.',
      descriptionJa: 'これは実機確認済みの日本語キャラクター紹介で、役割と実際の使い方を理解するための固有情報を十分に含みます。',
      abilityZh: '这是经过实机验证的中文能力说明，解释了具体效果、触发条件、数值表现和使用时需要注意的限制，并说明了不同战斗环境中的实用技巧。',
      ability: 'This verified ability explanation covers its effects, activation conditions, and the practical limits players need to consider.',
      abilityJa: 'これは実機確認済みの能力説明で、効果、発動条件、運用時に注意すべき制限を整理しています。',
      locationNote: 'This verified location note provides distinct route guidance, encounter conditions, and details that are not repeated from the character summary.',
      evolutionDetail: 'This verified evolution detail explains the progression requirements, branch conditions, and changes that matter to players planning the character.',
      sourceNote: 'This source note records the direct in-game or official evidence used to verify the entry and the date when the information was checked.',
    };

    for (const locale of ['zh', 'en', 'ja'] as const) {
      expect(isAniimoCharacterIndexable(entry, locale)).toBe(true);
    }
  });
});
