import Link from 'next/link';
import type { SupportedLocale } from '@gachia/core';
import { fillTeam, resolveTeamMember, teamName, type TeamCharacter, type TeamRecommendation } from '../lib/teams';
import { text } from '../lib/i18n';

export function TeamRecommendations({ characters, recommendations, locale, onUse }: {
  characters: TeamCharacter[]; recommendations: TeamRecommendation[]; locale: SupportedLocale; onUse?: (team: TeamRecommendation) => void;
}) {
  if (!recommendations.length) return <p role="status">{text(locale, { zh: '暂无对应的配队资料。', en: 'No matching team references.', ja: '該当する編成資料はありません。' })}</p>;
  return <div className="teams-tool__recommendations">{recommendations.map(team => {
    const name = (locale === 'zh' ? team.name : team.nameEn || team.name) || text(locale, { zh: '未命名队伍', en: 'Unnamed team', ja: '名前のない編成' });
    const filled = fillTeam(characters, team.members).filter(Boolean).length;
    return <article key={team.key} data-team-key={team.key}>
      <h3>{name}</h3><ol>{team.members.map((member, index) => {
        const character = resolveTeamMember(characters, member);
        return <li key={index}>{character ? <Link href={`/${locale}/genshin/characters/${character.id}`}><img src={character.image} alt="" width={44} height={44} loading="lazy" /><span>{teamName(character, locale)}</span></Link> : <span className="teams-tool__unresolved">{member}</span>}</li>;
      })}</ol>
      <p>{(locale === 'zh' ? team.description : team.descriptionEn || team.description) || text(locale, { zh: '暂无配队说明。', en: 'No team description available.', ja: '編成説明は未掲載です。' })}</p>
      {filled < 4 && <p className="meta">{text(locale, { zh: `可填入 ${filled}/4 个位置，未识别或重复成员留空。`, en: `${filled}/4 slots resolved; unknown or repeated members remain empty.`, ja: `${filled}/4枠を解決。未登録・重複メンバーの枠は空欄です。` })}</p>}
      <footer>{team.overlap > 0 && <span className="meta">{text(locale, { zh: `已选角色匹配 ${team.overlap}`, en: `${team.overlap} selected matches`, ja: `選択中の一致：${team.overlap}` })}</span>}
        {onUse && <button type="button" disabled={!filled} onClick={() => onUse(team)} aria-label={text(locale, { zh: `使用队伍：${name}`, en: `Use team: ${name}`, ja: `編成を使用：${name}` })}>{text(locale, { zh: '使用此队伍', en: 'Use team', ja: 'この編成を使用' })}</button>}
      </footer>
    </article>;
  })}</div>;
}
