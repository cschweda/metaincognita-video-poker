import type { Card } from './cards'

export type HandRank =
  | 'Royal Flush'
  | 'Straight Flush'
  | 'Four of a Kind'
  | 'Full House'
  | 'Flush'
  | 'Straight'
  | 'Three of a Kind'
  | 'Two Pair'
  | 'Jacks or Better'
  | 'Nothing'

/**
 * Classify a 5-card hand into standard poker hand categories.
 * Returns the best hand rank. "Nothing" means no paying hand.
 *
 * This is the base classifier for non-wild, non-bonus variants.
 * Bonus/DDB variants extend this with their own four-of-a-kind sub-categories.
 */
export function classifyHand(cards: Card[]): HandRank {
  if (cards.length !== 5) return 'Nothing'

  const ranks = cards.map(c => c.rank).sort((a, b) => a - b)
  const suits = cards.map(c => c.suit)

  const isFlush = suits.every(s => s === suits[0])

  // Count rank occurrences
  const rankCounts: Record<number, number> = {}
  for (const r of ranks) {
    rankCounts[r] = (rankCounts[r] || 0) + 1
  }
  const counts = Object.values(rankCounts).sort((a, b) => b - a)

  // Check straight
  const uniqueRanks = [...new Set(ranks)].sort((a, b) => a - b)
  const isRegularStraight = uniqueRanks.length === 5 && uniqueRanks[4]! - uniqueRanks[0]! === 4
  const isAceLowStraight = uniqueRanks.join(',') === '2,3,4,5,14'
  const isStraight = isRegularStraight || isAceLowStraight

  // Royal flush: A-K-Q-J-10 all same suit
  if (isFlush && uniqueRanks.join(',') === '10,11,12,13,14') return 'Royal Flush'

  if (isFlush && isStraight) return 'Straight Flush'

  if (counts[0] === 4) return 'Four of a Kind'

  if (counts[0] === 3 && counts[1] === 2) return 'Full House'

  if (isFlush) return 'Flush'

  if (isStraight) return 'Straight'

  if (counts[0] === 3) return 'Three of a Kind'

  if (counts[0] === 2 && counts[1] === 2) return 'Two Pair'

  // Jacks or Better: a pair of J, Q, K, or A
  if (counts[0] === 2) {
    const pairRank = Number(Object.keys(rankCounts).find(r => rankCounts[Number(r)] === 2))
    if (pairRank >= 11) return 'Jacks or Better'
  }

  return 'Nothing'
}

/**
 * Extended classifier for Bonus Poker variants.
 * Differentiates four-of-a-kind by rank group.
 */
export type BonusHandRank =
  | 'Royal Flush'
  | 'Straight Flush'
  | 'Four Aces'
  | 'Four 2s-4s'
  | 'Four 5s-Ks'
  | 'Full House'
  | 'Flush'
  | 'Straight'
  | 'Three of a Kind'
  | 'Two Pair'
  | 'Jacks or Better'
  | 'Nothing'

export function classifyBonusHand(cards: Card[]): BonusHandRank {
  const base = classifyHand(cards)

  if (base === 'Four of a Kind') {
    const rankCounts: Record<number, number> = {}
    for (const c of cards) {
      rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1
    }
    const quadRank = Number(Object.keys(rankCounts).find(r => rankCounts[Number(r)] === 4))
    if (quadRank === 14) return 'Four Aces'
    if (quadRank >= 2 && quadRank <= 4) return 'Four 2s-4s'
    return 'Four 5s-Ks'
  }

  return base as BonusHandRank
}

/**
 * Extended classifier for Double Double Bonus.
 * Differentiates four-of-a-kind by rank AND kicker.
 */
export type DDBHandRank =
  | 'Royal Flush'
  | 'Straight Flush'
  | 'Four Aces + 2-4'
  | 'Four Aces + 5-K'
  | 'Four 2s-4s + A-4'
  | 'Four 2s-4s + 5-K'
  | 'Four 5s-Ks'
  | 'Full House'
  | 'Flush'
  | 'Straight'
  | 'Three of a Kind'
  | 'Two Pair'
  | 'Jacks or Better'
  | 'Nothing'

export function classifyDDBHand(cards: Card[]): DDBHandRank {
  const base = classifyHand(cards)

  if (base === 'Four of a Kind') {
    const rankCounts: Record<number, number> = {}
    for (const c of cards) {
      rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1
    }
    const quadRank = Number(Object.keys(rankCounts).find(r => rankCounts[Number(r)] === 4))
    const kickerRank = Number(Object.keys(rankCounts).find(r => rankCounts[Number(r)] === 1))

    if (quadRank === 14) {
      return (kickerRank >= 2 && kickerRank <= 4) ? 'Four Aces + 2-4' : 'Four Aces + 5-K'
    }
    if (quadRank >= 2 && quadRank <= 4) {
      return (kickerRank === 14 || (kickerRank >= 2 && kickerRank <= 4))
        ? 'Four 2s-4s + A-4'
        : 'Four 2s-4s + 5-K'
    }
    return 'Four 5s-Ks'
  }

  return base as DDBHandRank
}
