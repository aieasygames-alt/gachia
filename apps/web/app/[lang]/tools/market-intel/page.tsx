import type { Metadata } from 'next';
import { BarChart3, CheckCircle2, FileText, Link2, ShieldAlert, Target } from 'lucide-react';
import { GAMES, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { buildLocalizedAlternates } from '@/lib/seo-metadata';
import { KEYWORD_RISK_RULES } from '@/lib/keyword-governance';
import {
  MARKET_INTEL_BATCH_ID,
  MARKET_INTEL_OPPORTUNITIES,
  MARKET_INTEL_SOURCE_REPORT,
  getMarketIntelByPriority,
  getMarketIntelValidationIssues,
  sortMarketIntelByPriority,
  type MarketIntelPriority,
  type MarketIntelStatus,
} from '@/lib/market-intel';

const TITLE = {
  zh: '游戏情报执行面板',
  en: 'Market Intel Dashboard',
  ja: '市場インテル実行ボード',
};

const DESCRIPTION = {
  zh: '本地查看 Gachia 游戏情报采样、内容 backlog、风险词治理和执行状态。',
  en: 'Review Gachia market-intel sampling, content backlog, keyword governance, and execution status locally.',
  ja: 'Gachia の市場インテル、コンテンツ backlog、キーワード治理、実行状態をローカルで確認します。',
};

function t(locale: SupportedLocale, zh: string, en: string, ja: string) {
  return locale === 'zh' ? zh : locale === 'ja' ? ja : en;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = lang as SupportedLocale;

  return {
    title: `${TITLE[locale]} - Gachia`,
    description: DESCRIPTION[locale],
    robots: { index: false, follow: false },
    alternates: buildLocalizedAlternates(locale, (lang) => `/${lang}/tools/market-intel`, LOCALES),
  };
}

const priorityClass: Record<MarketIntelPriority, string> = {
  P0: 'border-red-500/30 bg-red-500/10 text-red-200',
  P1: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  P2: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
};

const statusClass: Record<MarketIntelStatus, string> = {
  todo: 'border-slate-500/30 bg-slate-500/10 text-slate-200',
  in_progress: 'border-blue-500/30 bg-blue-500/10 text-blue-200',
  done: 'border-green-500/30 bg-green-500/10 text-green-200',
  deferred: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-200',
  rejected: 'border-red-500/30 bg-red-500/10 text-red-200',
};

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${className}`}>
      {children}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="rounded-lg border border-game-border bg-game-surface p-4">
      <div className="mb-3 flex items-center gap-2 text-game-text-muted">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="text-xs font-medium uppercase">{label}</span>
      </div>
      <div className="text-2xl font-bold text-game-text">{value}</div>
      <p className="mt-1 text-xs leading-relaxed text-game-text-muted">{helper}</p>
    </div>
  );
}

function gameName(gameId: GameId, locale: SupportedLocale) {
  return GAMES[gameId].name[locale] ?? GAMES[gameId].name.zh;
}

export default async function MarketIntelPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = lang as SupportedLocale;
  const validationIssues = getMarketIntelValidationIssues();
  const sortedOpportunities = sortMarketIntelByPriority(MARKET_INTEL_OPPORTUNITIES);
  const p0Count = getMarketIntelByPriority('P0').length;
  const p1Count = getMarketIntelByPriority('P1').length;
  const coveredGames = new Set(MARKET_INTEL_OPPORTUNITIES.map((item) => item.gameId)).size;
  const riskyTerms = new Set(MARKET_INTEL_OPPORTUNITIES.flatMap((item) => item.riskTerms)).size;

  return (
    <div className="container mx-auto px-4 py-6">
      <section className="mb-6 rounded-lg border border-game-border bg-game-surface p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge className="border-game-primary/30 bg-game-primary/10 text-game-primary">
            {MARKET_INTEL_BATCH_ID}
          </Badge>
          <Badge className={validationIssues.length === 0 ? 'border-green-500/30 bg-green-500/10 text-green-200' : 'border-red-500/30 bg-red-500/10 text-red-200'}>
            {validationIssues.length === 0
              ? t(locale, '校验通过', 'Validation passed', '検証済み')
              : t(locale, '需要处理', 'Needs attention', '要確認')}
          </Badge>
        </div>
        <h1 className="mb-3 text-3xl font-bold text-game-text">{TITLE[locale]}</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-game-text-muted">
          {t(
            locale,
            '这个页面用于本地查看情报采样转内容生产系统的执行情况：哪些游戏有机会、优先级如何、目标页面在哪里、哪些词需要规避。',
            'Use this local page to review the market-intel execution state: opportunities, priorities, target pages, and keyword governance.',
            'このローカルページでは、市場インテルの機会、優先度、対象ページ、キーワード治理を確認できます。'
          )}
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-game-text-muted">
          <span>{t(locale, '来源报告', 'Source report', '元レポート')}: {MARKET_INTEL_SOURCE_REPORT}</span>
          <span>{t(locale, '索引策略', 'Indexing', 'インデックス')}: noindex</span>
        </div>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={Target} label="P0" value={p0Count} helper={t(locale, '立即执行内容机会', 'Immediate content opportunities', '即時対応の機会')} />
        <StatCard icon={BarChart3} label="P1" value={p1Count} helper={t(locale, '本周内跟进机会', 'Follow-up opportunities this week', '今週対応の機会')} />
        <StatCard icon={FileText} label={t(locale, '游戏', 'Games', 'ゲーム')} value={coveredGames} helper={t(locale, '已覆盖站点游戏', 'Supported games covered', '対応ゲームを網羅')} />
        <StatCard icon={ShieldAlert} label={t(locale, '风险词', 'Risk terms', 'リスク語')} value={riskyTerms} helper={t(locale, '从承接词中分离', 'Separated from target keywords', '対象語から分離')} />
        <StatCard icon={CheckCircle2} label={t(locale, '校验问题', 'Issues', '問題')} value={validationIssues.length} helper={t(locale, '数据结构校验结果', 'Data validation result', 'データ検証結果')} />
      </section>

      {validationIssues.length > 0 && (
        <section className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <h2 className="mb-2 text-sm font-semibold text-red-100">{t(locale, '校验问题', 'Validation issues', '検証問題')}</h2>
          <ul className="space-y-1 text-sm text-red-100/80">
            {validationIssues.map((issue) => <li key={issue}>{issue}</li>)}
          </ul>
        </section>
      )}

      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <Target className="h-5 w-5 text-game-primary" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-game-text">{t(locale, '内容机会 Backlog', 'Content Opportunity Backlog', 'コンテンツ機会 Backlog')}</h2>
        </div>
        <div className="grid gap-4">
          {sortedOpportunities.map((opportunity) => (
            <article key={opportunity.id} className="rounded-lg border border-game-border bg-game-surface p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge className={priorityClass[opportunity.priority]}>{opportunity.priority}</Badge>
                <Badge className={statusClass[opportunity.status]}>{opportunity.status}</Badge>
                <Badge className="border-game-border bg-game-surface-alt text-game-text-muted">
                  {gameName(opportunity.gameId, locale)}
                </Badge>
                <span className="text-xs text-game-text-muted">{opportunity.sourceDate}</span>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-game-text">{opportunity.title}</h3>
              <p className="mb-4 text-sm leading-relaxed text-game-text-muted">{opportunity.notes}</p>

              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase text-game-text-muted">{t(locale, '承接词簇', 'Target keywords', '対象キーワード')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {opportunity.keywordCluster.map((keyword) => (
                      <Badge key={keyword} className="border-emerald-500/20 bg-emerald-500/10 text-emerald-100">{keyword}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase text-game-text-muted">{t(locale, '风险词', 'Risk terms', 'リスク語')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {opportunity.riskTerms.map((keyword) => (
                      <Badge key={keyword} className="border-red-500/20 bg-red-500/10 text-red-100">{keyword}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase text-game-text-muted">{t(locale, '目标页面', 'Target pages', '対象ページ')}</h4>
                  <ul className="space-y-1 text-sm text-game-text-muted">
                    {opportunity.targetPages.map((page) => (
                      <li key={page} className="flex items-center gap-2">
                        <Link2 className="h-3.5 w-3.5 text-game-primary" aria-hidden="true" />
                        <code>{page}</code>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase text-game-text-muted">{t(locale, '动作', 'Actions', 'アクション')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {opportunity.actions.map((action) => (
                      <Badge key={action} className="border-sky-500/20 bg-sky-500/10 text-sky-100">{action}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-game-border bg-game-surface p-5">
        <div className="mb-3 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-game-primary" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-game-text">{t(locale, '关键词治理规则', 'Keyword Governance Rules', 'キーワード治理ルール')}</h2>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {KEYWORD_RISK_RULES.map((rule) => (
            <div key={`${rule.category}-${rule.term}`} className="rounded-lg border border-game-border bg-game-bg/50 p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <code className="text-sm text-game-text">{rule.term}</code>
                <Badge className="border-red-500/20 bg-red-500/10 text-red-100">{rule.category}</Badge>
              </div>
              <p className="text-xs leading-relaxed text-game-text-muted">{rule.reason}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
