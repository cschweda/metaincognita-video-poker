import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { createDeck } from '../app/utils/cards'
import { analyzeHand } from '../app/utils/evCalculator'
import { PAY_TABLES } from '../app/utils/payTables'
import { analyzeHandAsync, __resetWorkerStateForTests } from '../app/utils/evAnalysisClient'

describe('analyzeHandAsync', () => {
  beforeEach(() => {
    __resetWorkerStateForTests()
  })

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

  it('retries with a fresh worker after a single failure instead of failing over forever', async () => {
    vi.useFakeTimers()

    let constructed = 0
    class SilentWorker {
      onmessage: ((e: MessageEvent) => void) | null = null
      onerror: ((e: unknown) => void) | null = null
      constructor() { constructed++ }
      postMessage() { /* never responds */ }
      terminate() { /* noop */ }
    }
    vi.stubGlobal('Worker', SilentWorker)

    const deck = createDeck()
    const dealt = deck.slice(0, 5)
    const remaining = deck.slice(5, 15)

    // First hand: worker hangs, request times out and resolves via fallback
    const first = analyzeHandAsync(dealt, 'job-9-6', remaining, 5)
    await vi.advanceTimersByTimeAsync(15_000)
    await first
    expect(constructed).toBe(1)

    // Second hand: a new worker must be constructed (not permanent sync fallback)
    const second = analyzeHandAsync(dealt, 'job-9-6', remaining, 5)
    await vi.advanceTimersByTimeAsync(15_000)
    const viaClient = await second
    expect(constructed).toBe(2)

    const direct = analyzeHand(dealt, PAY_TABLES['job-9-6']!, remaining, 5)
    expect(viaClient).toEqual(direct)
  })

  it('stops retrying after repeated consecutive failures', async () => {
    vi.useFakeTimers()

    let constructed = 0
    class SilentWorker {
      onmessage: ((e: MessageEvent) => void) | null = null
      onerror: ((e: unknown) => void) | null = null
      constructor() { constructed++ }
      postMessage() { /* never responds */ }
      terminate() { /* noop */ }
    }
    vi.stubGlobal('Worker', SilentWorker)

    const deck = createDeck()
    const dealt = deck.slice(0, 5)
    const remaining = deck.slice(5, 15)

    for (let attempt = 0; attempt < 2; attempt++) {
      const request = analyzeHandAsync(dealt, 'job-9-6', remaining, 5)
      await vi.advanceTimersByTimeAsync(15_000)
      await request
    }
    expect(constructed).toBe(2)

    // Third hand resolves synchronously without constructing another worker
    const third = await analyzeHandAsync(dealt, 'job-9-6', remaining, 5)
    expect(constructed).toBe(2)
    expect(third).toHaveLength(32)
  })

  it('resets the failure count after a successful worker response', async () => {
    vi.useFakeTimers()

    let constructed = 0
    let respondNext = false
    class FlakyWorker {
      onmessage: ((e: MessageEvent) => void) | null = null
      onerror: ((e: unknown) => void) | null = null
      constructor() { constructed++ }
      postMessage(msg: { id: number }) {
        if (respondNext) {
          const id = msg.id
          queueMicrotask(() => {
            this.onmessage?.({ data: { id, options: [] } } as MessageEvent)
          })
        }
      }

      terminate() { /* noop */ }
    }
    vi.stubGlobal('Worker', FlakyWorker)

    const deck = createDeck()
    const dealt = deck.slice(0, 5)
    const remaining = deck.slice(5, 15)

    // Failure #1
    const first = analyzeHandAsync(dealt, 'job-9-6', remaining, 5)
    await vi.advanceTimersByTimeAsync(15_000)
    await first
    expect(constructed).toBe(1)

    // Success resets the count
    respondNext = true
    await analyzeHandAsync(dealt, 'job-9-6', remaining, 5)
    expect(constructed).toBe(2)

    // Failure #2 (but count restarted at 0, so the NEXT hand still retries)
    respondNext = false
    const third = analyzeHandAsync(dealt, 'job-9-6', remaining, 5)
    await vi.advanceTimersByTimeAsync(15_000)
    await third

    const fourth = analyzeHandAsync(dealt, 'job-9-6', remaining, 5)
    expect(constructed).toBe(3)
    await vi.advanceTimersByTimeAsync(15_000)
    await fourth
  })
})
