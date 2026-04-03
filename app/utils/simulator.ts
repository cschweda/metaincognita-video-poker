import type { Card } from './cards'
import { createDeck, shuffle } from './cards'
import type { PayTableDef } from './payTables'
import { getPayForHand } from './payTables'
import { analyzeHand } from './evCalculator'
import { classifyHand, classifyBonusHand, classifyDDBHand } from './handClassifier'
import { classifyDeucesWild } from './wildClassifier'

export interface SimulationResult {
  payTableId: string
  variant: string
  shortName: string
  theoreticalReturn: number
  handsPlayed: number
  totalWagered: number
  totalReturned: number
  actualReturn: number
  handFrequencies: Record<string, number>
  durationMs: number
}

/**
 * Run a simulation of N hands with optimal play for a given pay table.
 * Returns statistics on actual vs theoretical return and hand frequencies.
 *
 * For statistical reliability:
 * - 1,000 hands: very rough estimate, variance is huge (~85-115% range)
 * - 10,000 hands: reasonable estimate, within a few % of theoretical
 * - 100,000 hands: solid, within ~0.5% of theoretical
 * - 1,000,000 hands: very tight convergence
 */
export function runSimulation(
  payTable: PayTableDef,
  numHands: number,
  coins: number = 5,
  onProgress?: (completed: number) => void
): SimulationResult {
  const start = performance.now()
  const handFrequencies: Record<string, number> = {}
  let totalReturned = 0
  const totalWagered = numHands * coins

  for (let i = 0; i < numHands; i++) {
    // Deal
    const fullDeck = shuffle(createDeck())
    const dealt = fullDeck.slice(0, 5)
    const remaining = fullDeck.slice(5)

    // Find optimal play
    const analysis = analyzeHand(dealt, payTable, remaining, coins)
    const optimal = analysis[0]!

    // Execute the optimal hold: draw replacement cards
    const finalHand = [...dealt]
    const heldSet = new Set(optimal.heldIndices)
    let drawIdx = 0
    for (let j = 0; j < 5; j++) {
      if (!heldSet.has(j)) {
        finalHand[j] = remaining[drawIdx]!
        drawIdx++
      }
    }

    // Classify the final hand
    const handName = classifyForSim(finalHand, payTable)
    handFrequencies[handName] = (handFrequencies[handName] || 0) + 1

    if (handName !== 'Nothing') {
      totalReturned += getPayForHand(payTable, handName, coins)
    }

    if (onProgress && i % 100 === 0) {
      onProgress(i)
    }
  }

  const durationMs = performance.now() - start

  return {
    payTableId: payTable.id,
    variant: payTable.variant,
    shortName: payTable.shortName,
    theoreticalReturn: payTable.returnPct,
    handsPlayed: numHands,
    totalWagered,
    totalReturned,
    actualReturn: (totalReturned / totalWagered) * 100,
    handFrequencies,
    durationMs
  }
}

function classifyForSim(cards: Card[], payTable: PayTableDef): string {
  if (payTable.classifier === 'deucesWild') return classifyDeucesWild(cards)
  if (payTable.classifier === 'ddb') return classifyDDBHand(cards)
  if (payTable.classifier === 'bonus') return classifyBonusHand(cards)
  return classifyHand(cards)
}
