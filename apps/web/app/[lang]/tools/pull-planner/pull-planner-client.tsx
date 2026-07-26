'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Calculator, CheckCircle2, Copy, RotateCcw } from 'lucide-react';
import { GAMES } from '@gachia/core';
import type { SupportedLocale } from '@gachia/core';
import {
  PULL_PLANNER_GAMES,
  calculatePullPlan,
  type PullPlannerGameId,
  type PullPlannerInput,
} from '@/lib/pull-planner';

const STORAGE_KEY = 'gachia-pull-planner-v1';
const SUPPORTED_GAMES = Object.keys(PULL_PLANNER_GAMES) as PullPlannerGameId[];

function t(locale: SupportedLocale, zh: string, en: string, ja: string) {
  return locale === 'zh' ? zh : locale === 'ja' ? ja : en;
}

function getDefaultEndDate() {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().slice(0, 10);
}

function defaultInput(): PullPlannerInput {
  return {
    gameId: 'starrail',
    currentPulls: 20,
    currentPity: 30,
    guaranteed: false,
    currency: 1600,
    targetCopies: 1,
    bannerEndDate: getDefaultEndDate(),
    dailyPulls: 0.7,
  };
}

function readSavedInput(): PullPlannerInput {
  if (typeof window === 'undefined') return defaultInput();
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultInput();
    const parsed = { ...defaultInput(), ...JSON.parse(saved) } as PullPlannerInput;
    if (!SUPPORTED_GAMES.includes(parsed.gameId)) return defaultInput();
    return parsed;
  } catch {
    return defaultInput();
  }
}

function NumberField({
  label,
  value,
  min = 0,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-game-text-muted">{label}</span>
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 w-full rounded-lg border border-game-border bg-game-surface-alt px-3 text-sm text-game-text outline-none transition-colors focus:border-game-primary"
      />
    </label>
  );
}

export function PullPlannerClient({ locale }: { locale: SupportedLocale }) {
  const [input, setInput] = useState<PullPlannerInput>(() => readSavedInput());
  const result = useMemo(() => calculatePullPlan(input), [input]);
  const config = PULL_PLANNER_GAMES[input.gameId];

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
    } catch {}
  }, [input]);

  const update = <K extends keyof PullPlannerInput>(key: K, value: PullPlannerInput[K]) => {
    setInput((current) => ({ ...current, [key]: value }));
  };

  const riskCopy = {
    ready: {
      title: t(locale, '资源充足', 'Ready', '準備完了'),
      body: t(locale, '按最坏保底估算，你已经覆盖目标。', 'Your worst-case guarantee is covered.', '最悪天井でも目標に届く見込みです。'),
      className: 'border-green-500/30 bg-green-500/10 text-green-300',
      icon: CheckCircle2,
    },
    close: {
      title: t(locale, '接近目标', 'Close', 'あと少し'),
      body: t(locale, '缺口不大，优先补活动、兑换码和日常。', 'The gap is small. Prioritize events, codes, and dailies.', '不足は小さめです。イベント、コード、日課を優先しましょう。'),
      className: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
      icon: AlertTriangle,
    },
    short: {
      title: t(locale, '风险较高', 'Short', '不足気味'),
      body: t(locale, '按最坏情况还差较多，建议降低目标或继续攒。', 'The worst-case gap is large. Lower the target or keep saving.', '最悪ケースでは不足が大きいため、目標を下げるか貯蓄を続けましょう。'),
      className: 'border-red-500/30 bg-red-500/10 text-red-300',
      icon: AlertTriangle,
    },
  }[result.risk];
  const RiskIcon = riskCopy.icon;

  const copySummary = async () => {
    const summary = [
      `Gachia Pull Planner`,
      `${GAMES[input.gameId].name[locale]} ${input.targetCopies} target copy/copies`,
      `Available: ${result.totalAvailablePulls} pulls`,
      `Worst-case needed: ${result.worstCasePullsNeeded} pulls`,
      `Missing: ${result.missingPulls} pulls`,
      `Banner days remaining: ${result.daysRemaining}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(summary);
    } catch {}
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <section className="mb-6 rounded-2xl border border-game-border bg-game-surface p-6 shadow-lg">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-game-primary/10 text-game-primary">
            <Calculator className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="rounded-full border border-game-border px-3 py-1 text-xs text-game-text-muted">
            {t(locale, '不登录可用，自动保存本机输入', 'No login required, saved locally', 'ログイン不要、ローカル保存')}
          </span>
        </div>
        <h1 className="mb-3 text-3xl font-bold text-game-text">
          {t(locale, '抽卡规划器', 'Pull Planner', 'ガチャ計画ツール')}
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-game-text-muted">
          {t(
            locale,
            '用当前抽数、垫抽、保底状态、货币和卡池结束时间估算目标角色的最坏保底缺口。',
            'Estimate the worst-case gap for your target using pulls, pity, guarantee status, currency, and banner end date.',
            '現在のチケット、天井、確定状態、通貨、バナー終了日から最悪ケースの不足を見積もります。'
          )}
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <section className="rounded-2xl border border-game-border bg-game-surface p-5">
          <div className="mb-5 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-game-text-muted">
                {t(locale, '游戏', 'Game', 'ゲーム')}
              </span>
              <select
                value={input.gameId}
                onChange={(event) => update('gameId', event.target.value as PullPlannerGameId)}
                className="h-11 w-full rounded-lg border border-game-border bg-game-surface-alt px-3 text-sm text-game-text outline-none transition-colors focus:border-game-primary"
              >
                {SUPPORTED_GAMES.map((gameId) => (
                  <option key={gameId} value={gameId}>
                    {GAMES[gameId].name[locale]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-game-text-muted">
                {t(locale, '卡池结束日', 'Banner end date', 'バナー終了日')}
              </span>
              <input
                type="date"
                value={input.bannerEndDate}
                onChange={(event) => update('bannerEndDate', event.target.value)}
                className="h-11 w-full rounded-lg border border-game-border bg-game-surface-alt px-3 text-sm text-game-text outline-none transition-colors focus:border-game-primary"
              />
            </label>
            <NumberField label={t(locale, '现有抽数', 'Current pulls', '所持チケット')} value={input.currentPulls} onChange={(value) => update('currentPulls', value)} />
            <NumberField label={t(locale, '当前垫抽', 'Current pity', '現在の天井カウント')} value={input.currentPity} onChange={(value) => update('currentPity', value)} />
            <NumberField label={config.currencyName} value={input.currency} onChange={(value) => update('currency', value)} />
            <NumberField label={t(locale, '目标金数', 'Target copies', '目標数')} value={input.targetCopies} min={1} onChange={(value) => update('targetCopies', value)} />
            <NumberField label={t(locale, '每日预计抽数', 'Daily pull income', '1日あたりの見込み')} value={input.dailyPulls} step={0.1} onChange={(value) => update('dailyPulls', value)} />
            <label className="flex min-h-11 items-center gap-3 rounded-lg border border-game-border bg-game-surface-alt px-3 text-sm text-game-text">
              <input
                type="checkbox"
                checked={input.guaranteed}
                onChange={(event) => update('guaranteed', event.target.checked)}
                className="h-4 w-4 accent-game-primary"
              />
              {t(locale, '下一金为大保底 / 确定 UP', 'Next 5-star/S-rank is guaranteed', '次の高レアは確定')}
            </label>
          </div>

          <div className="rounded-xl border border-game-border bg-game-bg/80 p-4 text-xs leading-relaxed text-game-text-muted">
            {t(locale, '透明算法：货币按', 'Transparent math: currency converts at ', '計算式：通貨は')}
            {' '}
            {config.currencyPerPull} {config.currencyName} / {config.pullName}
            {t(locale, `，${GAMES[input.gameId].name[locale]} 硬保底按 ${config.hardPity} 抽计算；非大保底按两轮保底估算。`, `, hard pity is ${config.hardPity}; non-guaranteed targets are estimated as two pity cycles.`, `、天井は${config.hardPity}連、非確定は2天井で見積もります。`)}
          </div>
        </section>

        <aside className="rounded-2xl border border-game-border bg-game-surface p-5">
          <div className={`mb-4 rounded-xl border p-4 ${riskCopy.className}`}>
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <RiskIcon className="h-5 w-5" aria-hidden="true" />
              {riskCopy.title}
            </div>
            <p className="text-sm">{riskCopy.body}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label={t(locale, '可用抽数', 'Available pulls', '利用可能')} value={result.totalAvailablePulls} />
            <Metric label={t(locale, '最坏需求', 'Worst-case need', '最悪必要数')} value={result.worstCasePullsNeeded} />
            <Metric label={t(locale, '还差', 'Missing', '不足')} value={result.missingPulls} />
            <Metric label={t(locale, '剩余天数', 'Days left', '残り日数')} value={result.daysRemaining} />
            <Metric label={t(locale, '货币折算', 'From currency', '通貨換算')} value={result.pullsFromCurrency} />
            <Metric label={t(locale, '日常预计', 'Daily projection', '日課見込み')} value={result.projectedDailyPulls} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setInput(defaultInput())}
              className="inline-flex items-center gap-2 rounded-lg border border-game-border px-3 py-2 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {t(locale, '重置', 'Reset', 'リセット')}
            </button>
            <button
              type="button"
              onClick={copySummary}
              className="inline-flex items-center gap-2 rounded-lg bg-game-primary px-3 py-2 text-sm font-semibold text-game-bg transition-opacity hover:opacity-90"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              {t(locale, '复制结果', 'Copy result', '結果をコピー')}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-game-border bg-game-bg/80 p-4">
      <div className="text-xs text-game-text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold text-game-text">{value}</div>
    </div>
  );
}
