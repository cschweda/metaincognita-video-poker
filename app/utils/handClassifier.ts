import type { Card } from './cards'
import { handShape, rankCounts } from './handShape'

export type HandRank
  = | 'Royal Flush'
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

  const { rankCounts: rc, counts, isFlush, isStraight, isRoyal } = handShape(cards)

  if (isRoyal) return 'Royal Flush'

  if (isFlush && isStraight) return 'Straight Flush'

  if (counts[0] === 4) return 'Four of a Kind'

  if (counts[0] === 3 && counts[1] === 2) return 'Full House'

  if (isFlush) return 'Flush'

  if (isStraight) return 'Straight'

  if (counts[0] === 3) return 'Three of a Kind'

  if (counts[0] === 2 && counts[1] === 2) return 'Two Pair'

  // Jacks or Better: a pair of J, Q, K, or A
  if (counts[0] === 2) {
    const pairRank = [...rc.entries()].find(([, n]) => n === 2)![0]
    if (pairRank >= 11) return 'Jacks or Better'
  }

  return 'Nothing'
}

/**
 * Extended classifier for Bonus Poker variants.
 * Differentiates four-of-a-kind by rank group.
 */
export type BonusHandRank
  = | 'Royal Flush'
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
    const rc = rankCounts(cards)
    const quadRank = [...rc.entries()].find(([, n]) => n === 4)![0]
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
export type DDBHandRank
  = | 'Royal Flush'
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
    const rc = rankCounts(cards)
    const quadRank = [...rc.entries()].find(([, n]) => n === 4)![0]
    const kickerRank = [...rc.entries()].find(([, n]) => n === 1)![0]

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
