import type { Card } from './cards'

/**
 * The one implementation of the poker-shape primitives every classifier,
 * strategy table, and persona previously re-derived inline (the ace-low
 * wheel check alone existed in four files). Works for partial holds too:
 * isStraight/isRoyal are only ever true for 5 distinct ranks.
 */
export interface HandShape {
  /** Card ranks sorted ascending (duplicates kept) */
  ranks: number[]
  /** Distinct ranks sorted ascending */
  uniqueRanks: number[]
  /** rank -> occurrence count */
  rankCounts: Map<number, number>
  /** Occurrence counts sorted descending, e.g. a full house is [3, 2] */
  counts: number[]
  /** All cards share one suit */
  isFlush: boolean
  /** Five consecutive distinct ranks, including the wheel A-2-3-4-5 */
  isStraight: boolean
  /** Suited A-K-Q-J-10 */
  isRoyal: boolean
}

const WHEEL_KEY = '2,3,4,5,14'
const BROADWAY_KEY = '10,11,12,13,14'

export function rankCounts(cards: Card[]): Map<number, number> {
  const rc = new Map<number, number>()
  for (const c of cards) rc.set(c.rank, (rc.get(c.rank) || 0) + 1)
  return rc
}

export function sortedCounts(rc: Map<number, number>): number[] {
  return [...rc.values()].sort((a, b) => b - a)
}

export function handShape(cards: Card[]): HandShape {
  const ranks = cards.map(c => c.rank).sort((a, b) => a - b)
  const uniqueRanks = [...new Set(ranks)]
  const rc = rankCounts(cards)
  const counts = sortedCounts(rc)
  const isFlush = cards.length > 0 && cards.every(c => c.suit === cards[0]!.suit)
  const key = uniqueRanks.join(',')
  const isStraight = uniqueRanks.length === 5
    && (uniqueRanks[4]! - uniqueRanks[0]! === 4 || key === WHEEL_KEY)
  const isRoyal = isFlush && key === BROADWAY_KEY
  return { ranks, uniqueRanks, rankCounts: rc, counts, isFlush, isStraight, isRoyal }
}
