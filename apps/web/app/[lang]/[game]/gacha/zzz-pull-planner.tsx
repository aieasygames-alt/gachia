'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SupportedLocale } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';
import { zzzCharacters, getZzzCharacterName } from '@gachia/data/games/zzz/characters';

function t(locale: SupportedLocale, zh: string, en: string, ja?: string) {
  return locale === 'zh' ? zh : locale === 'ja' ? (ja ?? en) : en;
}

const INITIAL = { polychromes: 0, encryptedTapes: 0, pity: 0, guaranteed: false, wantEngine: false, targetId: '' };

export function ZzzPullPlanner({ locale }: { locale: SupportedLocale }) {
  const [state, setState] = useState(INITIAL);
  const [ownedAgents, setOwnedAgents] = useState<Set<string>>(new Set());
  const [rosterGapIds, setRosterGapIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('gachia-zzz-pull-plan') ?? 'null');
      if (saved && typeof saved === 'object') setState({ ...INITIAL, ...saved });
      setOwnedAgents(new Set(JSON.parse(localStorage.getItem('gachia-zzz-owned-agents') ?? '[]')));
      setRosterGapIds(JSON.parse(localStorage.getItem('gachia-zzz-roster-gaps') ?? '[]'));
    } catch { /* local storage is optional */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem('gachia-zzz-pull-plan', JSON.stringify(state)); } catch { /* local storage is optional */ }
  }, [loaded, state]);
  const pulls = Math.max(0, Math.floor(state.polychromes / 160) + state.encryptedTapes);
  const agentWorst = state.guaranteed ? Math.max(0, 90 - state.pity) : Math.max(0, 180 - state.pity);
  const engineWorst = state.wantEngine ? 80 : 0;
  const totalNeed = agentWorst + engineWorst;
  const gap = Math.max(0, totalNeed - pulls);
  const target = zzzCharacters.find((character) => character.id === state.targetId);
  const rosterGapCandidates = rosterGapIds
    .map((id) => zzzCharacters.find((character) => character.id === id))
    .filter((character): character is NonNullable<typeof character> => character !== undefined)
    .filter((character) => !ownedAgents.has(character.id));
  const targetAlreadyOwned = target ? ownedAgents.has(target.id) : false;
  const targetFillsRosterGap = target ? rosterGapIds.includes(target.id) : false;
  const targetRoleCoverage = target ? zzzCharacters.filter((character) => ownedAgents.has(character.id) && character.specialtyEn === target.specialtyEn).length : 0;
  const recommendation = useMemo(() => {
    if (targetAlreadyOwned) return t(locale, '该代理人已在你的角色池中。除非你明确追影画或收藏，优先保留资源给新的队伍缺位。', 'This agent is already in your roster. Unless you are deliberately chasing Mindscapes or collecting, preserve resources for a new roster gap.', 'このエージェントは既に所持しています。意図的に心象映画や収集を狙う場合以外は、新しい編成不足のために資源を温存しましょう。');
    if (pulls >= totalNeed) return t(locale, '你的资源足以按最坏情况锁定目标。角色和音擎都想要时，仍建议先确认角色到手。', 'Your resources cover the worst-case target. If chasing both, confirm the agent before committing to the W-Engine.', '最悪ケースでも目標を確保できます。両方狙う場合も、まずエージェント確保を確認してください。');
    if (pulls >= agentWorst) return state.wantEngine ? t(locale, '角色可按最坏情况保证，但专属音擎仍有缺口。优先拿角色，再根据版本后半资源决定是否追音擎。', 'The agent is covered in the worst case, but the W-Engine is not. Secure the agent first, then decide on the engine after later-patch income.', 'エージェントは最悪ケースでも確保できますが、Wエンジンには不足があります。まずエージェントを確保し、後半の収入を見て判断してください。') : targetFillsRosterGap ? t(locale, '角色最坏情况已覆盖，且它出现在你的队伍缺位候选中。出现于已确认卡池时，可作为优先目标评估。', 'The agent is covered in the worst case and appears in your roster-gap candidates. If it is confirmed on a banner, it is worth evaluating as a priority target.', 'エージェントは最悪ケースでも確保でき、編成不足候補にも入っています。実装バナーが確認できたら優先候補として評価できます。') : t(locale, '角色最坏情况已覆盖。若你的队伍缺少对应定位，可以把本期目标作为优先项。', 'The agent is covered in the worst case. If this role fills a roster gap, it is a defensible priority.', 'エージェントは最悪ケースでも確保できます。編成の穴を埋める役割なら優先候補です。');
    return t(locale, '目前无法按最坏情况保证。除非这个目标直接补齐第一或第二队关键位，否则建议保留资源并继续观察版本信息。', 'You cannot guarantee the target in the worst case yet. Unless it fixes a critical first- or second-team role, save and keep watching the patch.', '現状では最悪ケースを保証できません。第一・第二編成の重要枠を直接埋める場合を除き、温存してバージョン情報を見守るのが安全です。');
  }, [agentWorst, locale, pulls, state.wantEngine, targetAlreadyOwned, targetFillsRosterGap, totalNeed]);
  const numberField = (key: 'polychromes' | 'encryptedTapes' | 'pity', label: string, hint: string) => <label className="block border border-game-border bg-game-surface p-3"><span className="block text-sm font-medium text-game-text">{label}</span><span className="mt-1 block text-xs text-game-text-muted">{hint}</span><input type="number" min="0" value={state[key]} onChange={(event) => setState((current) => ({ ...current, [key]: Math.max(0, Number(event.target.value)) }))} className="mt-3 w-full border-b border-game-border bg-transparent py-1 text-xl font-semibold text-game-text outline-none focus:border-game-primary" /></label>;
  return <div className="space-y-6">
    <section className="border border-game-border bg-game-surface p-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-game-primary">{t(locale, '抽取与资源决策', 'Pull and resource decision', 'ガチャと資源判断')}</p>
      <h1 className="text-2xl font-bold text-game-text">{t(locale, '绝区零菲林规划器', 'ZZZ Pull Planner', 'ZZZ ポリクローム計画')}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-game-text-muted">{t(locale, '输入自己的菲林、加密母带、当前小保底和是否大保底，按最坏情况估算目标缺口。卡池角色和日期会变化，具体目标请在版本页确认。数值会保存在本机。', 'Enter your Polychromes, Encrypted Master Tapes, pity, and guarantee state to estimate worst-case gaps. Banner targets and dates change; confirm them on the version hub. Values are saved on this device.', 'ポリクローム、暗号化マスターテープ、天井、確定状態から最悪ケースの不足を見積もります。バナー対象と日程は変わるため、版本ページで確認してください。入力はこの端末に保存されます。')}</p>
    </section>

    {rosterGapCandidates.length > 0 && <section className="border border-game-border bg-game-surface p-4">
      <h2 className="font-semibold text-game-text">{t(locale, '配队器识别的补位候选', 'Roster-gap candidates from Team Builder', '編成ツールの不足候補')}</h2>
      <p className="mt-1 text-xs leading-5 text-game-text-muted">{t(locale, '这些角色来自你当前已拥有代理人与推荐队的差异。它们只是规划候选；是否在当前或未来卡池出现，请以版本页和官方公告为准。', 'These agents come from the gap between your saved roster and listed teams. They are planning candidates only; confirm current or future availability on the version hub and official notices.', '保存した手持ちと掲載編成の差分から作った候補です。現在・将来の実装状況はバージョンページと公式告知で確認してください。')}</p>
      <div className="mt-3 flex flex-wrap gap-2">{rosterGapCandidates.map((character) => <button key={character.id} type="button" onClick={() => setState((current) => ({ ...current, targetId: character.id }))} className={`border px-3 py-2 text-left text-sm transition-colors ${state.targetId === character.id ? 'border-game-primary bg-game-primary/10 text-game-text' : 'border-game-border bg-game-surface-alt text-game-text-muted hover:border-game-primary'}`}><span className="block font-medium">{getZzzCharacterName(character, locale)}</span><span className="block text-xs">{character.specialtyEn}</span></button>)}</div>
    </section>}

    <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      {numberField('polychromes', t(locale, '菲林', 'Polychromes', 'ポリクローム'), t(locale, '160 菲林 = 1 抽', '160 per pull', '160で1回'))}
      {numberField('encryptedTapes', t(locale, '加密母带', 'Encrypted Master Tapes', '暗号化マスターテープ'), t(locale, '直接计入限定抽数', 'Added directly to limited pulls', '限定回数に直接加算'))}
      {numberField('pity', t(locale, '当前距离上次 S 级', 'Pulls since last S-Rank', '前回S級からの回数'), t(locale, '当前限定代理人频道', 'Current limited agent channel', '現在の限定エージェントチャンネル'))}
      <label className="block border border-game-border bg-game-surface p-3"><span className="block text-sm font-medium text-game-text">{t(locale, '计划目标', 'Planned target', '計画目標')}</span><span className="mt-1 block text-xs text-game-text-muted">{t(locale, '可选任意代理人作资源判断', 'Optional roster-aware target', '手持ちを考慮する任意目標')}</span><select value={state.targetId} onChange={(event) => setState((current) => ({ ...current, targetId: event.target.value }))} className="mt-3 w-full border-b border-game-border bg-transparent py-1 text-sm font-semibold text-game-text outline-none focus:border-game-primary"><option value="">{t(locale, '暂不指定', 'No target selected', '未選択')}</option>{zzzCharacters.map((character) => <option key={character.id} value={character.id}>{getZzzCharacterName(character, locale)} · {character.specialtyEn}</option>)}</select></label>
    </section>

    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="border border-game-border bg-game-surface p-4"><div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => setState((current) => ({ ...current, guaranteed: !current.guaranteed }))} className={`border p-4 text-left ${state.guaranteed ? 'border-game-primary bg-game-primary/10' : 'border-game-border bg-game-surface-alt'}`}><span className="block font-semibold text-game-text">{t(locale, '下个 S 级是限定', 'Next S-Rank is guaranteed', '次のS級は確定')}</span><span className="mt-1 block text-xs text-game-text-muted">{state.guaranteed ? t(locale, '已开启大保底', 'Guaranteed state on', '確定状態: ON') : t(locale, '未开启，按可能歪一次估算', 'Off: model one lost 50/50', 'OFF: 1回すり抜けを想定')}</span></button><button type="button" onClick={() => setState((current) => ({ ...current, wantEngine: !current.wantEngine }))} className={`border p-4 text-left ${state.wantEngine ? 'border-game-primary bg-game-primary/10' : 'border-game-border bg-game-surface-alt'}`}><span className="block font-semibold text-game-text">{t(locale, '同时计划专属音擎', 'Include signature W-Engine', '餅Wエンジンも計画')}</span><span className="mt-1 block text-xs text-game-text-muted">{state.wantEngine ? t(locale, '追加 80 抽最坏情况储备', 'Add 80 worst-case pulls', '最悪80回を追加') : t(locale, '先只保证代理人', 'Secure agent only first', 'まずエージェントだけ確保')}</span></button></div>{target && <p className="mt-4 text-sm text-game-text-muted">{targetAlreadyOwned ? t(locale, `已拥有 ${getZzzCharacterName(target, locale)}。`, `You already own ${getZzzCharacterName(target, locale)}.`, `${getZzzCharacterName(target, locale)}は所持済みです。`) : targetFillsRosterGap ? t(locale, `${getZzzCharacterName(target, locale)} 是你的配队缺位候选；请先确认其卡池可用性。`, `${getZzzCharacterName(target, locale)} is a roster-gap candidate. Confirm banner availability first.`, `${getZzzCharacterName(target, locale)}は編成不足候補です。先にバナー実装を確認してください。`) : t(locale, `你的角色池已有 ${targetRoleCoverage} 位 ${target.specialtyEn} 定位代理人。`, `Your roster already has ${targetRoleCoverage} ${target.specialtyEn} agents.`, `手持ちには${target.specialtyEn}が${targetRoleCoverage}人います。`)}</p>}<p className="mt-5 border-l-2 border-game-primary pl-3 text-sm leading-6 text-game-text-muted">{recommendation}</p><div className="mt-5 flex flex-wrap gap-3 text-sm"><Link href="/zzz/teams" className="text-game-primary hover:text-game-accent">{t(locale, '用配队器检查角色缺口', 'Check roster gaps in Team Builder', '編成の穴を確認')}</Link><Link href="/zzz/version" className="text-game-primary hover:text-game-accent">{t(locale, '查看当前版本与卡池观察', 'Open version watch hub', '版本ウォッチへ')}</Link></div></div>
      <aside className="border border-game-primary/40 bg-game-surface p-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-game-primary">{t(locale, '资源结论', 'Resource result', '資源結果')}</p><dl className="mt-4 space-y-4"><div><dt className="text-xs text-game-text-muted">{t(locale, '可用限定抽数', 'Available limited pulls', '利用可能な限定回数')}</dt><dd className="text-3xl font-bold text-game-text">{pulls}</dd></div><div><dt className="text-xs text-game-text-muted">{t(locale, '最坏情况需求', 'Worst-case need', '最悪ケース必要数')}</dt><dd className="text-xl font-bold text-game-text">{totalNeed}</dd></div><div><dt className="text-xs text-game-text-muted">{t(locale, '仍需预留', 'Still to reserve', '追加で確保')}</dt><dd className={`text-xl font-bold ${gap ? 'text-amber-300' : 'text-emerald-400'}`}>{gap}</dd></div></dl></aside>
    </section>
  </div>;
}
