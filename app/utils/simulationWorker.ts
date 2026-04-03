/**
 * Web Worker for video poker simulation.
 * Vite bundles this as a separate module with all its imports resolved.
 */
import type { Card } from './cards'
import { createDeck, shuffle } from './cards'
import type { PayTableDef } from './payTables'
import { getPayForHand } from './payTables'
import { classifyHand, classifyBonusHand, classifyDDBHand } from './handClassifier'
import { classifyDeucesWild } from './wildClassifier'
import { fastOptimalHold } from './strategyLookup'

function classifyForSim(cards: Card[], payTable: PayTableDef): string {
  if (payTable.classifier === 'deucesWild') return classifyDeucesWild(cards)
  if (payTable.classifier === 'ddb') return classifyDDBHand(cards)
  if (payTable.classifier === 'bonus') return classifyBonusHand(cards)
  return classifyHand(cards)
}

function runSim(payTable: PayTableDef, numHands: number, coins: number, runIndex: number, variantIndex: number) {
  const start = performance.now()
  const handFrequencies: Record<string, number> = {}
  let totalReturned = 0
  const totalWagered = numHands * coins

  for (let i = 0; i < numHands; i++) {
    const fullDeck = shuffle(createDeck())
    const dealt = fullDeck.slice(0, 5)
    const remaining = fullDeck.slice(5)

    const heldIndices = fastOptimalHold(dealt, payTable)
    const heldSet = new Set(heldIndices)

    const finalHand = [...dealt]
    let drawIdx = 0
    for (let j = 0; j < 5; j++) {
      if (!heldSet.has(j)) {
        finalHand[j] = remaining[drawIdx]!
        drawIdx++
      }
    }

    const handName = classifyForSim(finalHand, payTable)
    handFrequencies[handName] = (handFrequencies[handName] || 0) + 1
    if (handName !== 'Nothing') {
      totalReturned += getPayForHand(payTable, handName, coins)
    }

    // Progress every 100 hands
    if (i % 100 === 0) {
      self.postMessage({
        type: 'progress',
        variantIndex,
        runIndex,
        completed: i,
        total: numHands
      })
    }
  }

  self.postMessage({
    type: 'result',
    variantIndex,
    runIndex,
    result: {
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
  })
}

// Handle messages from main thread
self.onmessage = (e: MessageEvent) => {
  const { type } = e.data

  if (type === 'run') {
    const { payTable, numHands, coins, runIndex, variantIndex } = e.data
    runSim(payTable, numHands, coins, runIndex, variantIndex)
  }

  if (type === 'runAll') {
    const { targets, numHands, numRuns, coins } = e.data
    for (let vi = 0; vi < targets.length; vi++) {
      for (let ri = 0; ri < numRuns; ri++) {
        runSim(targets[vi].payTable, numHands, coins, ri, vi)
      }
    }
    self.postMessage({ type: 'allDone' })
  }
}
