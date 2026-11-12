import type { SupportedLocale } from '@gachia/core';
import { characterMaterials, getNteMaterialName, materials, nteCharacters } from './data';

const typeLabels: Record<string, [string, string, string]> = {
  guide: ['猎手指南', 'Hunter Guide', 'ハンターガイド'],
  'arc-exp': ['弧盘经验', 'Arc EXP', 'アルクEXP'],
  'module-exp': ['模块经验', 'Module EXP', 'モジュールEXP'],
  ascension: ['突破材料', 'Ascension', '昇格素材'],
  permit: ['许可', 'Permit', '許可証'],
  manual: ['技能手册', 'Skill Manual', 'スキルマニュアル'],
  currency: ['货币', 'Currency', '通貨'],
  special: ['特殊材料', 'Special', '特殊素材'],
};

export function nteMaterialDetail(id: string, locale: SupportedLocale) {
  const material = materials.find(row => row.id === id);
  if (!material) return null;
  const raw = material as typeof material & { sourceEn?: string; sourceJa?: string };
  const name = getNteMaterialName(material, locale);
  const source = locale === 'zh' ? raw.source ?? '' : locale === 'ja'
    ? raw.sourceJa ?? raw.sourceEn ?? raw.source ?? '' : raw.sourceEn ?? raw.source ?? '';
  const type = typeLabels[material.type ?? '']?.[locale === 'zh' ? 0 : locale === 'en' ? 1 : 2] ?? material.type ?? '';
  const ids = new Set(characterMaterials.filter(row => row.levelingMaterials.some(level => level.materials.some(item => item.id === id))
    || row.skillMaterials.some(item => item.id === id)).map(row => row.characterId));
  const characters = [...ids].flatMap(characterId => {
    const character = nteCharacters.find(row => row.id === characterId);
    return character ? [character] : [];
  });
  const game = locale === 'zh' ? '异环' : locale === 'ja' ? '異環' : 'Neverness to Everness';
  const description = locale === 'zh'
    ? `${name}是${game}中的${type}类材料。${source ? `获取方式：${source}。` : ''}${characters.length ? `共有${characters.length}个角色需要此材料用于突破或技能升级。` : '本页整理该材料的用途、掉落来源和获取路径。'}`
    : locale === 'ja' ? `${name}は${game}の${type}素材です。${source ? `入手方法：${source}。` : ''}${characters.length ? `${characters.length}体のキャラクターがこの素材を突破やスキル強化に必要とします。` : 'このページでは用途、入手先、必要キャラを整理しています。'}`
      : `${name} is a ${type.toLowerCase()} material in ${game}. ${source ? `Source: ${source}.` : ''}${characters.length ? `${characters.length} characters require this material for ascension or skill upgrades.` : "This page covers the material's uses, drop sources, and farming paths."}`;
  const faqs = [
    { question: locale === 'zh' ? `${name}在${game}中怎么获得？` : locale === 'ja' ? `${game}で${name}の入手方法は？` : `How to get ${name} in ${game}?`,
      answer: source || ({ zh: '暂未收录获取来源，请在游戏内确认。', en: 'No acquisition source is recorded; check in game.', ja: '入手先は未収録です。ゲーム内で確認してください。' })[locale] },
    { question: locale === 'zh' ? `${name}是${game}中的什么类型材料？` : locale === 'ja' ? `${name}は${game}のどんな素材ですか？` : `What type of material is ${name}?`, answer: type },
    { question: locale === 'zh' ? `哪些角色需要${name}？` : locale === 'ja' ? `${name}を必要とするキャラクターは？` : `Which characters need ${name}?`,
      answer: characters.length ? characters.map(row => locale === 'zh' ? row.name : row.nameEn).join(', ')
        : ({ zh: '当前资料未收录需要此材料的角色。', en: 'No character requirements are recorded in the current data.', ja: '現在のデータに必要キャラは収録されていません。' })[locale] },
  ];
  return { material, name, nameAlt: locale === 'zh' ? material.nameEn : material.name, source, type, characters, description, faqs };
}
