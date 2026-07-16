/**
 * Web Worker for video poker simulation.
 * Vite bundles this as a separate module with all its imports resolved.
 */
import type { PayTableDef } from './payTables'
import { createDeck, shuffle } from './cards'
import { getPayForHand } from './payTables'
import { classifyForPayTable } from './classify'
import { fastOptimalHold } from './strategyLookup'
import { makeRng, prngInt } from './prng'

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

function runSim(payTable: PayTableDef, numHands: number, coins: number, runIndex: number, variantIndex: number, seed: number) {
  const start = performance.now()
  const handFrequencies: Record<string, number> = {}
  let totalReturned = 0
  const totalWagered = numHands * coins

  // Monte-Carlo path: a seeded xorshift is far cheaper than the CSPRNG
  // (one getRandomValues call per swap adds up to ~1M calls per analysis
  // run) and makes runs reproducible. Real game deals still use crypto.
  const rng = makeRng(seed)
  const randInt = (n: number) => prngInt(rng, n)
  const baseDeck = createDeck()

  for (let i = 0; i < numHands; i++) {
    const fullDeck = shuffle(baseDeck, randInt)
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

    const handName = classifyForPayTable(finalHand, payTable)
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

  if (type === 'runAll') {
    const { targets, numHands, numRuns, coins, seed } = e.data
    // Fresh entropy per batch unless the caller pins a seed for reproducibility
    const baseSeed = typeof seed === 'number'
      ? seed >>> 0
      : crypto.getRandomValues(new Uint32Array(1))[0]!
    for (let vi = 0; vi < targets.length; vi++) {
      for (let ri = 0; ri < numRuns; ri++) {
        const runSeed = (baseSeed ^ Math.imul(vi + 1, 0x9E3779B9) ^ Math.imul(ri + 1, 0x85EBCA6B)) >>> 0
        runSim(targets[vi].payTable, numHands, coins, ri, vi, runSeed)
      }
    }
    self.postMessage({ type: 'allDone' })
  }
}
