import type { GameId, SupportedLocale } from '@gachia/core';
import { CalculatorClient } from './calculator-client';

export default async function CalculatorPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;

  return <CalculatorClient gameId={gameId} locale={locale} />;
}
