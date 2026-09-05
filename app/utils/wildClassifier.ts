import type { Card } from './cards'

/**
 * Wild-card-aware hand classifier for Deuces Wild.
 *
 * Uses top-down hand-type evaluation: classify the natural (non-wild) cards,
 * then check from the highest hand type downward whether the wilds can
 * complete it. This is O(H) where H is the number of hand types (~12),
 * not O(52^W) brute-force card assignment.
 *
 * Like handClassifier.ts this allocates nothing per call — the EV analyzer
 * runs it 2.6 million times per dealt hand. Its output is pinned to the
 * handShape-based reference over every 5-card hand in
 * tests/classifierIdentity.test.ts, and that reference was itself confirmed
 * against brute-force wild substitution on every hand.
 */

export type DeucesWildHandRank
  = | 'Natural Royal Flush'
    | 'Four Deuces'
    | 'Wild Royal Flush'
    | 'Five of a Kind'
    | 'Straight Flush'
    | 'Four of a Kind'
    | 'Full House'
    | 'Flush'
    | 'Straight'
    | 'Three of a Kind'
    | 'Nothing'

// Histogram of natural ranks (3..14); bit r of natMask ⇔ natural rank r present
const hist = new Int32Array(15)

const ROYAL_MASK = (1 << 10) | (1 << 11) | (1 << 12) | (1 << 13) | (1 << 14)
// Natural cards are never 2s, so the regular windows span 3-7 through 10-A
const STRAIGHT_MASKS: number[] = []
for (let low = 3; low <= 10; low++) {
  STRAIGHT_MASKS.push((1 << low) | (1 << (low + 1)) | (1 << (low + 2)) | (1 << (low + 3)) | (1 << (low + 4)))
}
// Ace-low wheel: the 2 slot can only ever be a wild, so the naturals are A-3-4-5
const WHEEL_NATURALS_MASK = (1 << 14) | (1 << 3) | (1 << 4) | (1 << 5)

// popcount over 15-bit masks
const POPCOUNT = new Uint8Array(1 << 15)
for (let m = 1; m < POPCOUNT.length; m++) POPCOUNT[m] = POPCOUNT[m >> 1]! + (m & 1)

/** Can the natural ranks + numWild wilds form any 5-card straight? */
function canMakeStraight(natMask: number, numWild: number): boolean {
  for (let i = 0; i < STRAIGHT_MASKS.length; i++) {
    const window = STRAIGHT_MASKS[i]!
    // Every natural rank must belong to the window (all 5 cards form the straight)
    if (natMask & ~window) continue
    // Window ranks missing from the naturals are the gaps the wilds must fill
    if (5 - POPCOUNT[natMask & window]! <= numWild) return true
  }
  // Wheel: one wild is consumed by the 2, the rest fill A-3-4-5 gaps
  if ((natMask & ~WHEEL_NATURALS_MASK) === 0) {
    if (4 - POPCOUNT[natMask]! + 1 <= numWild) return true
  }
  return false
}

export function classifyDeucesWild(cards: Card[]): DeucesWildHandRank {
  if (cards.length !== 5) return 'Nothing'

  hist.fill(0)
  let numWild = 0
  let natMask = 0
  let sameSuit = true
  let suit: Card['suit'] | null = null
  for (let i = 0; i < 5; i++) {
    const c = cards[i]!
    if (c.rank === 2) {
      numWild++
      continue
    }
    hist[c.rank] = hist[c.rank]! + 1
    natMask |= 1 << c.rank
    if (suit === null) suit = c.suit
    else if (c.suit !== suit) sameSuit = false
  }

  // --- 4 deuces ---
  if (numWild === 4) return 'Four Deuces'

  // Rank-count shape of the naturals
  let maxCount = 0
  let secondCount = 0
  for (let r = 3; r <= 14; r++) {
    const n = hist[r]!
    if (n === 0) continue
    if (n > maxCount) {
      secondCount = maxCount
      maxCount = n
    } else if (n > secondCount) {
      secondCount = n
    }
  }
  const distinct = POPCOUNT[natMask]!

  // --- 5 naturals (no wilds) ---
  if (numWild === 0) {
    // No natural 2s exist, so the wheel can never fire here
    const low = natMask & -natMask
    const isStraight = distinct === 5 && natMask / low === 31
    if (sameSuit && natMask === ROYAL_MASK) return 'Natural Royal Flush'
    if (sameSuit && isStraight) return 'Straight Flush'
    if (maxCount === 4) return 'Four of a Kind'
    if (maxCount === 3 && secondCount === 2) return 'Full House'
    if (sameSuit) return 'Flush'
    if (isStraight) return 'Straight'
    if (maxCount === 3) return 'Three of a Kind'
    // In Deuces Wild, pairs and two pair don't pay
    return 'Nothing'
  }

  // --- 1, 2, or 3 wilds --- check top-down

  // Wild Royal Flush — all naturals in the royal set, wilds fill the rest
  if (sameSuit && (natMask & ~ROYAL_MASK) === 0 && 5 - distinct <= numWild) {
    return 'Wild Royal Flush'
  }

  // Five of a Kind — all naturals same rank + wilds
  if (maxCount + numWild >= 5) return 'Five of a Kind'

  // Straight Flush — all same suit, and can make a straight with wilds
  if (sameSuit && canMakeStraight(natMask, numWild)) return 'Straight Flush'

  // Four of a Kind — highest count + wilds >= 4
  if (maxCount + numWild >= 4) return 'Four of a Kind'

  // Full House — boost the largest group to 3, then the second to 2
  if (distinct >= 2) {
    const needA = Math.max(0, 3 - maxCount)
    if (needA <= numWild && Math.max(0, 2 - secondCount) <= numWild - needA) return 'Full House'
  }

  // Flush — all naturals same suit (wilds can be any suit)
  if (sameSuit) return 'Flush'

  // Straight — a 5-card straight with wilds filling gaps
  if (canMakeStraight(natMask, numWild)) return 'Straight'

  // Three of a Kind — highest count + wilds >= 3
  if (maxCount + numWild >= 3) return 'Three of a Kind'

  return 'Nothing'
}
