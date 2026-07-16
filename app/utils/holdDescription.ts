import type { Card } from './cards'
import { cardLabel, RANK_NAMES, SUIT_NAMES } from './cards'
import { rankCounts } from './handShape'

/**
 * Human-readable description of a hold, e.g. "Hold the pair of Sevens".
 * Used by the training panel's OPTIMAL PLAY headline.
 */
export function describeHold(cards: Card[], isDeucesWild: boolean): string {
  if (cards.length === 0) return 'Discard everything — draw 5 new cards'
  if (cards.length === 5) return 'Hold all 5 cards — pat hand'

  // Deuces are only special in Deuces Wild — in other variants a 2 is a
  // normal card and must count toward pairs/trips descriptions.
  const deuces = isDeucesWild ? cards.filter(c => c.rank === 2) : []
  const naturals = isDeucesWild ? cards.filter(c => c.rank !== 2) : cards

  if (isDeucesWild && deuces.length > 0 && naturals.length === 0) {
    return `Hold ${deuces.length} deuce${deuces.length > 1 ? 's' : ''} (wild)`
  }

  // Detect patterns for more natural descriptions
  const described = naturals.length > 0 ? naturals : cards
  const ranks = described.map(c => c.rank)
  const suits = described.map(c => c.suit)
  const rc = rankCounts(described)

  const pairs = [...rc.entries()].filter(([, c]) => c >= 2)
  const allSameSuit = suits.length > 0 && suits.every(s => s === suits[0])

  const wildSuffix = isDeucesWild && deuces.length > 0
    ? ` + ${deuces.length} wild`
    : ''

  if (naturals.length === 2 && pairs.length === 1) {
    return `Hold the pair of ${RANK_NAMES[Number(pairs[0]![0])]}s${wildSuffix}`
  }
  if (naturals.length === 3 && pairs.length === 1 && [...rc.values()].includes(3)) {
    return `Hold three ${RANK_NAMES[Number(pairs[0]![0])]}s${wildSuffix}`
  }
  if (pairs.length === 2) {
    const [lo, hi] = pairs.map(([r]) => Number(r)).sort((a, b) => a - b)
    return `Hold two pair — ${RANK_NAMES[hi!]}s and ${RANK_NAMES[lo!]}s${wildSuffix}`
  }
  if (naturals.length >= 3 && allSameSuit && naturals.length + deuces.length === 4) {
    return `Hold 4 to a flush (${SUIT_NAMES[suits[0]!]})${wildSuffix}`
  }
  if (naturals.length >= 3 && naturals.length + deuces.length === 4) {
    // A straight draw needs DISTINCT ranks spanning ≤ 4 — without the
    // distinctness check, two pair like [3,3,7,7] (span 4) matches.
    const sorted = [...ranks].sort((a, b) => a - b)
    const distinctRanks = new Set(sorted).size === sorted.length
    const isStraightDraw = distinctRanks && sorted[sorted.length - 1]! - sorted[0]! <= 4
    if (isStraightDraw) return `Hold 4 to a straight${wildSuffix}`
  }
  if (naturals.length >= 2 && allSameSuit && naturals.length + deuces.length === 3) {
    return `Hold 3 to a flush (${SUIT_NAMES[suits[0]!]})${wildSuffix}`
  }

  // Fallback: list the cards
  const shortLabels = cards.map(c => cardLabel(c))
  return `Hold ${shortLabels.join(', ')}`
}

/**
 * Sentence comparing the optimal hold's EV to the runner-up's.
 */
export function describeEvGap(optimalEv: number, nextBestEv: number): string {
  const evDiff = optimalEv - nextBestEv
  if (evDiff > 0.001) {
    return `Next best option is ${((evDiff / optimalEv) * 100).toFixed(1)}% worse in EV.`
  }
  return 'Very close to the next-best option — a marginal edge.'
}
