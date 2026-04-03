import type { Card } from './cards'

/**
 * Wild-card-aware hand classifier for Deuces Wild.
 *
 * Uses top-down hand-type evaluation: classify the natural (non-wild) cards,
 * then check from the highest hand type downward whether the wilds can
 * complete it. This is O(H) where H is the number of hand types (~12),
 * not O(52^W) brute-force card assignment.
 */

export type DeucesWildHandRank =
  | 'Natural Royal Flush'
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

export function classifyDeucesWild(cards: Card[]): DeucesWildHandRank {
  if (cards.length !== 5) return 'Nothing'

  // Separate wilds (rank 2) from natural cards
  const wilds: Card[] = []
  const naturals: Card[] = []
  for (const c of cards) {
    if (c.rank === 2) {
      wilds.push(c)
    } else {
      naturals.push(c)
    }
  }

  const numWild = wilds.length

  // --- 4 deuces ---
  if (numWild === 4) return 'Four Deuces'

  // --- 5 naturals (no wilds) ---
  if (numWild === 0) return classifyNoWilds(naturals)

  // --- 1, 2, or 3 wilds ---
  const ranks = naturals.map(c => c.rank).sort((a, b) => a - b)
  const suits = naturals.map(c => c.suit)

  const isAllSameSuit = suits.every(s => s === suits[0])
  const rankCounts: Record<number, number> = {}
  for (const r of ranks) rankCounts[r] = (rankCounts[r] || 0) + 1
  const counts = Object.values(rankCounts).sort((a, b) => b - a)
  const uniqueRanks = [...new Set(ranks)].sort((a, b) => a - b)

  // Check top-down

  // Natural Royal Flush — impossible with wilds (it would be Wild Royal)

  // Wild Royal Flush — all same suit, and wilds can fill in to make A-K-Q-J-10
  if (isAllSameSuit && canMakeRoyal(uniqueRanks, numWild)) {
    return 'Wild Royal Flush'
  }

  // Five of a Kind — all naturals same rank + wilds
  if (counts[0]! + numWild >= 5) return 'Five of a Kind'

  // Straight Flush — all same suit, and can make a straight with wilds
  if (isAllSameSuit && canMakeStraight(uniqueRanks, numWild)) {
    return 'Straight Flush'
  }

  // Four of a Kind — highest count + wilds >= 4
  if (counts[0]! + numWild >= 4) return 'Four of a Kind'

  // Full House — need 3+2; with wilds we can boost counts
  if (canMakeFullHouse(counts, numWild)) return 'Full House'

  // Flush — all same suit (wilds can be any suit)
  if (isAllSameSuit) return 'Flush'

  // Straight — can make a 5-card straight with wilds filling gaps
  if (canMakeStraight(uniqueRanks, numWild)) return 'Straight'

  // Three of a Kind — highest count + wilds >= 3
  if (counts[0]! + numWild >= 3) return 'Three of a Kind'

  return 'Nothing'
}

/**
 * Classify a 5-card hand with no wild cards (used when numWild === 0).
 * Returns Deuces Wild hand types (Natural Royal only possible here).
 */
function classifyNoWilds(cards: Card[]): DeucesWildHandRank {
  const ranks = cards.map(c => c.rank).sort((a, b) => a - b)
  const suits = cards.map(c => c.suit)

  const isFlush = suits.every(s => s === suits[0])

  const rankCounts: Record<number, number> = {}
  for (const r of ranks) rankCounts[r] = (rankCounts[r] || 0) + 1
  const counts = Object.values(rankCounts).sort((a, b) => b - a)

  const uniqueRanks = [...new Set(ranks)].sort((a, b) => a - b)
  const isRegularStraight = uniqueRanks.length === 5 && uniqueRanks[4]! - uniqueRanks[0]! === 4
  const isAceLow = uniqueRanks.join(',') === '3,4,5,6,14' // no 2s in a no-wild hand
  const isStraight = isRegularStraight || isAceLow

  // Natural Royal Flush
  if (isFlush && uniqueRanks.join(',') === '10,11,12,13,14') return 'Natural Royal Flush'

  if (isFlush && isStraight) return 'Straight Flush'
  if (counts[0] === 4) return 'Four of a Kind'
  if (counts[0] === 3 && counts[1] === 2) return 'Full House'
  if (isFlush) return 'Flush'
  if (isStraight) return 'Straight'
  if (counts[0] === 3) return 'Three of a Kind'

  // In Deuces Wild, pairs and two pair don't pay
  return 'Nothing'
}

/**
 * Can the natural ranks + numWild wilds form a royal flush (A-K-Q-J-10)?
 */
function canMakeRoyal(uniqueRanks: number[], numWild: number): boolean {
  const royalRanks = [10, 11, 12, 13, 14]
  let needed = 0
  for (const r of royalRanks) {
    if (!uniqueRanks.includes(r)) needed++
  }
  // Also check no ranks outside the royal set
  for (const r of uniqueRanks) {
    if (!royalRanks.includes(r)) return false
  }
  return needed <= numWild
}

/**
 * Can the natural unique ranks + numWild wilds form any 5-card straight?
 * Checks all possible straight windows.
 */
function canMakeStraight(uniqueRanks: number[], numWild: number): boolean {
  // Possible straights: A-2-3-4-5 through 10-J-Q-K-A
  // But in Deuces Wild, 2s are wild, so straights use 3-14 for naturals
  // Ace-low: A-3-4-5-6 (with 2 being wild, ace-low is A,3,4,5,6 effectively)
  // Actually in Deuces Wild the ace-low straight would be A-2-3-4-5 but 2s are wild
  // So natural cards would be A,3,4,5 and one wild fills the 2 spot
  // Let's check all windows

  const straightWindows = [
    [3, 4, 5, 6, 7],    // lowest without 2
    [4, 5, 6, 7, 8],
    [5, 6, 7, 8, 9],
    [6, 7, 8, 9, 10],
    [7, 8, 9, 10, 11],
    [8, 9, 10, 11, 12],
    [9, 10, 11, 12, 13],
    [10, 11, 12, 13, 14],
    [14, 3, 4, 5, 6],   // ace-low (A,3,4,5,6 with a wild for the 2)
  ]

  for (const window of straightWindows) {
    // How many of the window ranks are missing from natural ranks?
    let gaps = 0
    let hasExtraRank = false
    for (const r of uniqueRanks) {
      if (!window.includes(r)) {
        hasExtraRank = true
        break
      }
    }
    if (hasExtraRank) continue

    for (const r of window) {
      if (!uniqueRanks.includes(r)) gaps++
    }
    if (gaps <= numWild) return true
  }

  // Also check the standard A-2-3-4-5 straight where 2 is used as a value 2
  // But in Deuces Wild, 2s are always wild, so the lowest non-wild straight component is 3
  // An ace-low straight needs: A, (wild for 2), 3, 4, 5

  return false
}

/**
 * Can we form a full house (3+2) given the counts and wilds?
 */
function canMakeFullHouse(counts: number[], numWild: number): boolean {
  if (counts.length < 2) {
    // Only one unique rank among naturals
    // e.g., 3 naturals same rank + 2 wilds = five of a kind (already caught above)
    // or 2 naturals same rank + 3 wilds = five of a kind (already caught)
    // So reaching here means we can't make a full house
    return false
  }

  // We need to distribute wilds across two groups to reach 3+2
  const a = counts[0]! // largest group
  const b = counts[1]! // second group

  // Try to boost a to 3, then b to 2 with remaining wilds
  let wildsLeft = numWild
  const needA = Math.max(0, 3 - a)
  if (needA > wildsLeft) return false
  wildsLeft -= needA
  const needB = Math.max(0, 2 - b)
  return needB <= wildsLeft
}
