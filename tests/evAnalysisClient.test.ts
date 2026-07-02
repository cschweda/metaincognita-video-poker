import { describe, it, expect, vi, afterEach } from 'vitest'
import { createDeck } from '../app/utils/cards'
import { analyzeHand } from '../app/utils/evCalculator'
import { PAY_TABLES } from '../app/utils/payTables'
import { analyzeHandAsync } from '../app/utils/evAnalysisClient'

describe('analyzeHandAsync', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('falls back to the synchronous analyzer when the worker never responds', async () => {
    vi.useFakeTimers()

    // A worker that swallows every message and never answers
    class SilentWorker {
      onmessage: ((e: MessageEvent) => void) | null = null
      onerror: ((e: unknown) => void) | null = null
      postMessage() { /* never responds */ }
      terminate() { /* noop */ }
    }
    vi.stubGlobal('Worker', SilentWorker)

    const deck = createDeck()
    const dealt = deck.slice(0, 5)
    const remaining = deck.slice(5, 15)

    const pending = analyzeHandAsync(dealt, 'job-9-6', remaining, 5)
    await vi.advanceTimersByTimeAsync(15_000)

    const viaClient = await pending
    const direct = analyzeHand(dealt, PAY_TABLES['job-9-6']!, remaining, 5)
    expect(viaClient).toEqual(direct)
  })

  it('falls back to the synchronous analyzer when Workers are unavailable (node)', async () => {
    const deck = createDeck()
    const dealt = deck.slice(0, 5)
    // Small draw pile keeps the brute force fast; correctness is unaffected
    const remaining = deck.slice(5, 15)

    const viaClient = await analyzeHandAsync(dealt, 'job-9-6', remaining, 5)
    const direct = analyzeHand(dealt, PAY_TABLES['job-9-6']!, remaining, 5)

    expect(viaClient).toEqual(direct)
    expect(viaClient).toHaveLength(32)
  })

  it('resolves with an empty list for an unknown pay table id', async () => {
    const deck = createDeck()
    const result = await analyzeHandAsync(deck.slice(0, 5), 'no-such-table', deck.slice(5, 15), 5)
    expect(result).toEqual([])
  })
})
