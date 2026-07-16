/**
 * Client for the EV analysis Web Worker.
 *
 * In the browser, hands are posted to a persistent worker so the ~1-2s
 * brute-force evaluation never blocks the main thread. When Workers are
 * unavailable (tests, SSR) falls back to running the analyzer synchronously.
 *
 * A worker error or timeout tears the worker down and resolves everything
 * in flight via the synchronous fallback, but the next hand gets a fresh
 * worker — a transient hiccup must not condemn the rest of the session to
 * main-thread analysis. Only repeated consecutive failures disable the
 * worker path; a successful response resets the count.
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
const MAX_CONSECUTIVE_FAILURES = 2

let worker: Worker | null = null
let consecutiveFailures = 0
let nextRequestId = 0
const pending = new Map<number, PendingRequest>()

/** @internal Test-only: reset module state between test cases. */
export function __resetWorkerStateForTests() {
  worker?.terminate()
  worker = null
  consecutiveFailures = 0
  for (const request of pending.values()) clearTimeout(request.timer)
  pending.clear()
}

function runSync(dealt: Card[], payTableId: string, remaining: Card[], coins: number): HoldAnalysis[] {
  const payTable = PAY_TABLES[payTableId]
  return payTable ? analyzeHand(dealt, payTable, remaining, coins) : []
}

/** Tear the worker down and resolve everything in flight via the fallback. */
function teardownWorker(reason: unknown) {
  console.error('EV analysis worker failed, falling back to main thread:', reason)
  consecutiveFailures++
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
  if (typeof Worker === 'undefined' || consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) return null
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
          consecutiveFailures = 0
          request.resolve(options)
        }
      }

      worker.onerror = (err) => {
        teardownWorker(err)
      }
    } catch {
      // Constructor threw: the environment doesn't support module workers
      consecutiveFailures = MAX_CONSECUTIVE_FAILURES
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
    // Executor form so a synchronous throw becomes a rejection, not an
    // exception escaping into the caller's deal flow
    return new Promise(resolve => resolve(runSync(dealt, payTableId, remaining, coins)))
  }

  return new Promise((resolve) => {
    const id = nextRequestId++
    const timer = setTimeout(
      () => teardownWorker(new Error(`analysis request ${id} timed out`)),
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
