/**
 * Web Worker for per-hand EV analysis.
 * Runs the brute-force 32-hold evaluation off the main thread so the
 * deal animation never blocks. Vite bundles this as a separate module.
 */
import { analyzeHand } from './evCalculator'
import { PAY_TABLES } from './payTables'

self.onmessage = (e: MessageEvent) => {
  const { id, dealt, payTableId, remaining, coins } = e.data
  const payTable = PAY_TABLES[payTableId]
  const options = payTable ? analyzeHand(dealt, payTable, remaining, coins) : []
  self.postMessage({ id, options })
}
