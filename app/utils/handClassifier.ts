import type { Card } from './cards'

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

/*
 * The classifiers are the hottest code in the app: the EV analyzer runs one
 * per enumerated draw, 2.6 million times per dealt hand. They therefore
 * allocate nothing per call — one module-level rank histogram, a 13-bit rank
 * mask and a handful of scalars are rewritten on every scan. Output is
 * pinned to the handShape-based reference implementations over every
 * 5-card hand in tests/classifierIdentity.test.ts. handShape.ts remains the
 * readable primitive for the strategy tables, personas and hold descriptions.
 */

// Rank histogram indexed by rank (2..14); bit r of rankMask ⇔ rank r present
const hist = new Int32Array(15)
let rankMask = 0
let isFlush = false
let isStraight = false
let maxCount = 0
let secondCount = 0
let quadRank = 0
let kickerRank = 0
let pairRank = 0

const BROADWAY_MASK = (1 << 10) | (1 << 11) | (1 << 12) | (1 << 13) | (1 << 14)
const WHEEL_MASK = (1 << 14) | (1 << 2) | (1 << 3) | (1 << 4) | (1 << 5)

/** Five consecutive bits, or the wheel — only meaningful when all five ranks are distinct */
function maskIsStraight(mask: number): boolean {
  const low = mask & -mask
  return mask / low === 31 || mask === WHEEL_MASK
}

function scan(cards: Card[]): void {
  hist.fill(0)
  rankMask = 0
  const suit0 = cards[0]!.suit
  isFlush = true
  for (let i = 0; i < 5; i++) {
    const c = cards[i]!
    hist[c.rank]++
    rankMask |= 1 << c.rank
    if (c.suit !== suit0) isFlush = false
  }
  maxCount = 0
  secondCount = 0
  quadRank = 0
  kickerRank = 0
  pairRank = 0
  for (let r = 2; r <= 14; r++) {
    const n = hist[r]!
    if (n === 0) continue
    if (n > maxCount) {
      secondCount = maxCount
      maxCount = n
    } else if (n > secondCount) {
      secondCount = n
    }
    if (n === 4) quadRank = r
    else if (n === 2) pairRank = r
    else if (n === 1) kickerRank = r
  }
  isStraight = maxCount === 1 && maskIsStraight(rankMask)
}

/**
 * Classify a 5-card hand into standard poker hand categories.
 * Returns the best hand rank. "Nothing" means no paying hand.
 *
 * This is the base classifier for non-wild, non-bonus variants.
 * Bonus/DDB variants extend this with their own four-of-a-kind sub-categories.
 */
export function classifyHand(cards: Card[]): HandRank {
  if (cards.length !== 5) return 'Nothing'
  scan(cards)

  if (isFlush && rankMask === BROADWAY_MASK && maxCount === 1) return 'Royal Flush'
  if (isFlush && isStraight) return 'Straight Flush'
  if (maxCount === 4) return 'Four of a Kind'
  if (maxCount === 3 && secondCount === 2) return 'Full House'
  if (isFlush) return 'Flush'
  if (isStraight) return 'Straight'
  if (maxCount === 3) return 'Three of a Kind'
  if (maxCount === 2 && secondCount === 2) return 'Two Pair'
  // Jacks or Better: a pair of J, Q, K, or A
  if (maxCount === 2 && pairRank >= 11) return 'Jacks or Better'
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
    // quadRank was set by the scan classifyHand just ran
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
    // quadRank / kickerRank were set by the scan classifyHand just ran
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
