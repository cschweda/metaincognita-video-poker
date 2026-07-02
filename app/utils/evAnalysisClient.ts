/**
 * Client for the EV analysis Web Worker.
 *
 * In the browser, hands are posted to a persistent worker so the ~1-2s
 * brute-force evaluation never blocks the main thread. When Workers are
 * unavailable (tests, SSR), the worker errors, or a request times out,
 * falls back to running the analyzer synchronously.
 */
import type { Card } from './cards'
import type { HoldAnalysis } from './evCalculator'
import { analyzeHand } from './evCalculator'
import { PAY_TABLES } from './payTables'

interface PendingRequest {
  resolve: (options: HoldAnalysis[]) => void
  fallback: () => HoldAnalysis[]
  timer: ReturnType<typeof setTimeout>
}

// A healthy worker answers in 1-2s; this only trips when something is broken
const WORKER_TIMEOUT_MS = 15_000

let worker: Worker | null = null
let workerFailed = false
let nextRequestId = 0
const pending = new Map<number, PendingRequest>()

function runSync(dealt: Card[], payTableId: string, remaining: Card[], coins: number): HoldAnalysis[] {
  const payTable = PAY_TABLES[payTableId]
  return payTable ? analyzeHand(dealt, payTable, remaining, coins) : []
}

/** Permanently fail over to main-thread analysis and resolve everything in flight. */
function failWorker(reason: unknown) {
  console.error('EV analysis worker unavailable, falling back to main thread:', reason)
  workerFailed = true
  worker?.terminate()
  worker = null
  const inFlight = [...pending.values()]
  pending.clear()
  for (const request of inFlight) {
    clearTimeout(request.timer)
    request.resolve(request.fallback())
  }
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
          clearTimeout(request.timer)
          request.resolve(options)
        }
      }

      worker.onerror = (err) => {
        failWorker(err)
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
    const timer = setTimeout(
      () => failWorker(new Error(`analysis request ${id} timed out`)),
      WORKER_TIMEOUT_MS
    )
    pending.set(id, {
      resolve,
      fallback: () => runSync(dealt, payTableId, remaining, coins),
      timer
    })
    w.postMessage({ id, dealt, payTableId, remaining, coins })
  })
}
