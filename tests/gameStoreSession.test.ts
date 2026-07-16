import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { HoldAnalysis } from '../app/utils/evCalculator'

import { useGameStore } from '../app/stores/game'

// Controllable analysis: each deal's analyzeHandAsync call is captured here
// and resolved manually by the test.
const pendingResolvers: ((options: HoldAnalysis[]) => void)[] = []

vi.mock('~/utils/evAnalysisClient', () => ({
  analyzeHandAsync: vi.fn(() =>
    new Promise<HoldAnalysis[]>((resolve) => {
      pendingResolvers.push(resolve)
    })
  )
}))

function option(heldIndices: number[], expectedValue: number): HoldAnalysis {
  return { heldIndices, heldCards: [], expectedValue, handDistribution: {} }
}

async function flushMicrotasks() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

/** Deal + resolve analysis + draw holding nothing — one complete hand. */
async function playOneHand(store: ReturnType<typeof useGameStore>) {
  store.deal()
  await vi.advanceTimersByTimeAsync(700)
  pendingResolvers[pendingResolvers.length - 1]!([option([], 0.5), option([0], 0.3)])
  await flushMicrotasks()
  store.draw()
  await vi.runAllTimersAsync()
}

describe('game store — session lifecycle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    pendingResolvers.length = 0
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('insertCredits adds 100 credits without wiping the session', async () => {
    const store = useGameStore()
    await playOneHand(store)

    const creditsBefore = store.credits
    const statsBefore = { ...store.stats }

    store.insertCredits()

    expect(store.credits).toBe(creditsBefore + 100)
    expect(store.stats.handsPlayed).toBe(statsBefore.handsPlayed)
    expect(store.handHistory).toHaveLength(1)
    expect(store.dealtDecks).toHaveLength(1)
  })

  it('endSession replays only completed hands, not a hand still in progress', async () => {
    const store = useGameStore()
    await playOneHand(store)

    // Second hand: dealt but never drawn
    store.deal()
    await vi.advanceTimersByTimeAsync(700)
    expect(store.phase).toBe('dealt')
    expect(store.dealtDecks).toHaveLength(2)

    store.endSession()

    expect(store.sessionEnded).toBe(true)
    for (const pr of store.personaResults) {
      expect(pr.handsPlayed).toBe(1)
      expect(pr.totalWagered).toBe(5)
    }
  })

  it('endSession does nothing when no hand has been completed', async () => {
    const store = useGameStore()
    store.deal()
    await vi.advanceTimersByTimeAsync(700)

    store.endSession()

    expect(store.sessionEnded).toBe(false)
    expect(store.personaResults).toHaveLength(0)
  })

  it('dealing after endSession resumes the session', async () => {
    const store = useGameStore()
    await playOneHand(store)

    store.endSession()
    expect(store.sessionEnded).toBe(true)
    expect(store.personaResults.length).toBeGreaterThan(0)

    store.deal()
    await vi.advanceTimersByTimeAsync(700)

    expect(store.sessionEnded).toBe(false)
    expect(store.personaResults).toHaveLength(0)
  })

  it('sessionElapsedMinutes advances with the clock via tickClock', async () => {
    const store = useGameStore()
    expect(store.sessionElapsedMinutes).toBe(0)

    await vi.advanceTimersByTimeAsync(5 * 60_000)
    store.tickClock()

    expect(store.sessionElapsedMinutes).toBe(5)
  })

  it('resetSession mid-deal cancels the flip timers', async () => {
    const store = useGameStore()
    store.deal()

    store.resetSession()
    await vi.runAllTimersAsync()

    expect(store.phase).toBe('idle')
    expect(store.hand.every(c => c === null)).toBe(true)
    expect(store.faceDown).toEqual([true, true, true, true, true])
    expect(store.stats.handsPlayed).toBe(0)
  })

  it('resetSession mid-draw cancels pending timers — no phantom hand corrupts the fresh session', async () => {
    const store = useGameStore()
    store.deal()
    await vi.advanceTimersByTimeAsync(700)
    expect(store.phase).toBe('dealt')

    store.draw()
    // Navigating home mid-animation resets the session while draw timers are pending
    store.resetSession()
    await vi.runAllTimersAsync()

    expect(store.phase).toBe('idle')
    expect(store.stats.handsPlayed).toBe(0)
    expect(store.stats.totalWagered).toBe(0)
    expect(store.handHistory).toHaveLength(0)
  })

  it('reconciles a late analysis for a previous hand after a new deal', async () => {
    const store = useGameStore()

    // Hand 1: player races ahead of the analysis
    store.deal()
    await vi.advanceTimersByTimeAsync(700)
    store.toggleHold(0)
    store.draw()
    await vi.runAllTimersAsync()
    expect(store.handHistory).toHaveLength(1)
    expect(store.stats.totalMistakes).toBe(0)

    // Hand 2 dealt before hand 1's analysis lands
    store.deal()
    await vi.advanceTimersByTimeAsync(700)

    // Hand 1's analysis finally arrives — it must still back-fill hand 1
    pendingResolvers[0]!([option([1, 2], 2.0), option([0], 1.5), option([], 0.3)])
    await flushMicrotasks()

    const entry = store.handHistory.find(h => h.handNumber === 1)!
    expect(entry.optimalHeld).toEqual([1, 2])
    expect(entry.playerEV).toBeCloseTo(1.5)
    expect(entry.optimalEV).toBeCloseTo(2.0)
    expect(entry.mistakeCost).toBeCloseTo(0.625)
    expect(store.stats.totalMistakes).toBe(1)
    expect(store.stats.totalEVLost).toBeCloseTo(0.625)
    expect(store.dealtDecks[0]!.optimalHeld).toEqual([1, 2])

    // The live analysis state belongs to hand 2, whose analysis is still pending
    expect(store.optimalPlay).toBeNull()
    expect(store.analysisPending).toBe(true)
  })
})
