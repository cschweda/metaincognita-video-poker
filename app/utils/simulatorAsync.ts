import type { Card } from './cards'
import { createDeck, shuffle } from './cards'
import type { PayTableDef } from './payTables'
import { getPayForHand } from './payTables'
import { classifyHand, classifyBonusHand, classifyDDBHand } from './handClassifier'
import { classifyDeucesWild } from './wildClassifier'
import { fastOptimalHold } from './strategyLookup'
import type { SimulationResult } from './simulator'

function classifyForSim(cards: Card[], payTable: PayTableDef): string {
  if (payTable.classifier === 'deucesWild') return classifyDeucesWild(cards)
  if (payTable.classifier === 'ddb') return classifyDDBHand(cards)
  if (payTable.classifier === 'bonus') return classifyBonusHand(cards)
  return classifyHand(cards)
}

function yieldToUI(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

/**
 * Run a simulation asynchronously using fast strategy lookup.
 *
 * Instead of brute-force EV (2.6M classifications per hand = ~100ms each),
 * uses a pattern-matching strategy table (~0.01ms per hand).
 * 1,000 hands completes in under 1 second.
 */
export async function runSimulationAsync(
  payTable: PayTableDef,
  numHands: number,
  coins: number = 5,
  onProgress?: (completed: number, total: number) => void
): Promise<SimulationResult> {
  const start = performance.now()
  const handFrequencies: Record<string, number> = {}
  let totalReturned = 0
  const totalWagered = numHands * coins
  const YIELD_INTERVAL = 200

  for (let i = 0; i < numHands; i++) {
    const fullDeck = shuffle(createDeck())
    const dealt = fullDeck.slice(0, 5)
    const remaining = fullDeck.slice(5)

    // Fast strategy lookup — O(1) per hand
    const heldIndices = fastOptimalHold(dealt, payTable)
    const heldSet = new Set(heldIndices)

    // Execute hold: draw replacements from the remaining deck
    const finalHand = [...dealt]
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

    if (i % YIELD_INTERVAL === 0) {
      onProgress?.(i + 1, numHands)
      await yieldToUI()
    }
  }

  onProgress?.(numHands, numHands)

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
    durationMs: performance.now() - start
  }
}
