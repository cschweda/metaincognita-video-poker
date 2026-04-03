import type { Card } from './cards'
import type { PayTableDef } from './payTables'
import { getPayForHand } from './payTables'
import { classifyHand, classifyBonusHand, classifyDDBHand } from './handClassifier'
import { classifyDeucesWild } from './wildClassifier'
import { combinations } from './combinations'
import { cardLabel } from './cards'

export interface HoldAnalysis {
  heldIndices: number[]
  heldCards: Card[]
  expectedValue: number
  handDistribution: Record<string, number>
}

/**
 * Classify a hand using the appropriate classifier for the pay table variant.
 */
function classifyForPayTable(cards: Card[], payTable: PayTableDef): string {
  if (payTable.classifier === 'deucesWild') return classifyDeucesWild(cards)
  if (payTable.classifier === 'ddb') return classifyDDBHand(cards)
  if (payTable.classifier === 'bonus') return classifyBonusHand(cards)
  return classifyHand(cards)
}

/**
 * Analyze all 32 possible hold patterns for a dealt hand.
 * For each pattern, evaluate every possible draw outcome and compute the EV.
 *
 * Returns all 32 options sorted by EV descending.
 */
export function analyzeHand(
  dealt: Card[],
  payTable: PayTableDef,
  remainingDeck: Card[],
  coins: number
): HoldAnalysis[] {
  const results: HoldAnalysis[] = []

  // 32 hold patterns (5-bit bitmask: 0b00000 to 0b11111)
  for (let mask = 0; mask < 32; mask++) {
    const heldIndices: number[] = []
    const heldCards: Card[] = []
    const discardCount = 5 - popcount(mask)

    for (let i = 0; i < 5; i++) {
      if (mask & (1 << i)) {
        heldIndices.push(i)
        heldCards.push(dealt[i]!)
      }
    }

    const handDistribution: Record<string, number> = {}
    let totalPayout = 0
    let totalCombinations = 0

    if (discardCount === 0) {
      // Hold all 5 — one outcome
      const handName = classifyForPayTable(dealt, payTable)
      const payout = handName === 'Nothing' ? 0 : getPayForHand(payTable, handName, coins)
      handDistribution[handName] = 1
      totalPayout = payout
      totalCombinations = 1
    } else {
      // Enumerate all C(remainingDeck.length, discardCount) draw combos
      const draws = combinations(remainingDeck, discardCount)
      totalCombinations = draws.length

      for (const drawCards of draws) {
        // Build the final hand: held cards in their positions + drawn cards filling gaps
        const finalHand: Card[] = [...dealt]
        let drawIdx = 0
        for (let i = 0; i < 5; i++) {
          if (!(mask & (1 << i))) {
            finalHand[i] = drawCards[drawIdx]!
            drawIdx++
          }
        }

        const handName = classifyForPayTable(finalHand, payTable)
        handDistribution[handName] = (handDistribution[handName] || 0) + 1

        if (handName !== 'Nothing') {
          totalPayout += getPayForHand(payTable, handName, coins)
        }
      }
    }

    // EV = average payout per coin wagered
    const expectedValue = totalPayout / (totalCombinations * coins)

    // Normalize distribution to probabilities
    const normalizedDist: Record<string, number> = {}
    for (const [hand, count] of Object.entries(handDistribution)) {
      normalizedDist[hand] = count / totalCombinations
    }

    results.push({
      heldIndices,
      heldCards,
      expectedValue,
      handDistribution: normalizedDist
    })
  }

  // Sort by EV descending
  results.sort((a, b) => b.expectedValue - a.expectedValue)

  return results
}

/**
 * Format held cards as a readable string like "7♦ 7♣" or "Hold nothing"
 */
export function formatHeldCards(analysis: HoldAnalysis): string {
  if (analysis.heldCards.length === 0) return 'Discard all'
  if (analysis.heldCards.length === 5) return 'Hold all'
  return analysis.heldCards.map(c => cardLabel(c)).join(' ')
}

function popcount(n: number): number {
  let count = 0
  while (n) {
    count += n & 1
    n >>= 1
  }
  return count
}
