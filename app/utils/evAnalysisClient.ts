/**
 * Client for the EV analysis Web Worker.
 *
 * In the browser, hands are posted to a persistent worker so the ~1-2s
 * brute-force evaluation never blocks the main thread. When Workers are
 * unavailable (tests, SSR) or the worker fails, falls back to running
 * the analyzer synchronously.
 */
import type { Card } from './cards'
import type { HoldAnalysis } from './evCalculator'
import { analyzeHand } from './evCalculator'
import { PAY_TABLES } from './payTables'

interface PendingRequest {
  resolve: (options: HoldAnalysis[]) => void
  fallback: () => HoldAnalysis[]
}

let worker: Worker | null = null
let workerFailed = false
let nextRequestId = 0
const pending = new Map<number, PendingRequest>()

function runSync(dealt: Card[], payTableId: string, remaining: Card[], coins: number): HoldAnalysis[] {
  const payTable = PAY_TABLES[payTableId]
  return payTable ? analyzeHand(dealt, payTable, remaining, coins) : []
}

function getWorker(): Worker | null {
  if (workerFailed || typeof Worker === 'undefined') return null
  if (!worker) {
    try {
      // Create worker with relative path (Vite resolves this)
      worker = new Worker(
        new URL('./evWorker.ts', import.meta.url),
        { type: 'module' }
      )

      worker.onmessage = (e: MessageEvent) => {
        const { id, options } = e.data
        const request = pending.get(id)
        if (request) {
          pending.delete(id)
          request.resolve(options)
        }
      }

      worker.onerror = (err) => {
        console.error('EV analysis worker error, falling back to main thread:', err)
        workerFailed = true
        worker?.terminate()
        worker = null
        // Resolve anything in flight on the main thread so no hand is left unanalyzed
        const inFlight = [...pending.values()]
        pending.clear()
        for (const request of inFlight) {
          request.resolve(request.fallback())
        }
      }
    } catch {
      workerFailed = true
      worker = null
    }
  }
  return worker
}

export function analyzeHandAsync(
  dealt: Card[],
  payTableId: string,
  remaining: Card[],
  coins: number
): Promise<HoldAnalysis[]> {
  const w = getWorker()
  if (!w) {
    return Promise.resolve(runSync(dealt, payTableId, remaining, coins))
  }

  return new Promise((resolve) => {
    const id = nextRequestId++
    pending.set(id, {
      resolve,
      fallback: () => runSync(dealt, payTableId, remaining, coins)
    })
    w.postMessage({ id, dealt, payTableId, remaining, coins })
  })
}
