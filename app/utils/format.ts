/**
 * Shared display formatting. These expressions were inlined ~20 times across
 * pages and panels (and the return-tier thresholds triplicated) — one home.
 */

/** Coins × denomination as a plain dollar string: 12.5 -> "3.13" */
export function formatDollars(coins: number, denomination: number): string {
  return (coins * denomination).toFixed(2)
}

/** Signed dollar string with leading + for gains: "+$1.25" / "-$0.50" */
export function formatSignedDollars(coins: number, denomination: number): string {
  const dollars = coins * denomination
  return `${dollars >= 0 ? '+' : '-'}$${Math.abs(dollars).toFixed(2)}`
}

/**
 * A hand's result net of its wager, signed. A 1:1 pair at 5 coins returns
 * the bet: "+$0.00", not a gain; no win is the whole wager: "-$1.25".
 */
export function formatHandNet(payoutCoins: number, coinsBet: number, denomination: number): string {
  return formatSignedDollars(payoutCoins - coinsBet, denomination)
}

export type ReturnTier = 'good' | 'ok' | 'bad'

/**
 * Session-return quality tier: ≥99% is near-optimal play, ≥96% is typical
 * recreational leakage, below that is throwing money away.
 */
export function returnTier(pct: number): ReturnTier {
  if (pct >= 99) return 'good'
  if (pct >= 96) return 'ok'
  return 'bad'
}

/** Tailwind text color for a return tier (dark theme). */
export const RETURN_TIER_TEXT: Record<ReturnTier, string> = {
  good: 'text-green-400',
  ok: 'text-amber-400',
  bad: 'text-red-400'
}
