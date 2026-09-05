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

  it('back-fills both hands when two hands are drawn before either analysis lands', async () => {
    const store = useGameStore()
    const mistakeOptions = () => [option([1, 2], 2.0), option([0], 1.5), option([], 0.3)]

    // Hand 1: hold card 0 and draw before the analysis
    store.deal()
    await vi.advanceTimersByTimeAsync(700)
    store.toggleHold(0)
    store.draw()
    await vi.runAllTimersAsync()

    // Hand 2: same play, still before either analysis has resolved
    store.deal()
    await vi.advanceTimersByTimeAsync(700)
    store.toggleHold(0)
    store.draw()
    await vi.runAllTimersAsync()
    expect(pendingResolvers).toHaveLength(2)

    pendingResolvers[0]!(mistakeOptions())
    await flushMicrotasks()
    pendingResolvers[1]!(mistakeOptions())
    await flushMicrotasks()

    // Both hands were mistakes (EV 1.5 vs 2.0 at 5 coins × $0.25 = $0.625 each)
    expect(store.stats.totalMistakes).toBe(2)
    expect(store.stats.totalEVLost).toBeCloseTo(1.25)
    const first = store.handHistory.find(h => h.handNumber === 1)!
    expect(first.optimalHeld).toEqual([1, 2])
    expect(first.mistakeCost).toBeCloseTo(0.625)
    const second = store.handHistory.find(h => h.handNumber === 2)!
    expect(second.mistakeCost).toBeCloseTo(0.625)
  })

  it('prices a late back-fill at the wager the hand was played for', async () => {
    const store = useGameStore()
    store.deal()
    await vi.advanceTimersByTimeAsync(700)
    store.toggleHold(0)
    store.draw()
    await vi.runAllTimersAsync()

    // The denomination changes before the analysis arrives; the hand was
    // played at $0.25, so its mistake must still cost 0.5 × 5 × $0.25
    store.denomination = 1.00
    pendingResolvers[0]!([option([1, 2], 2.0), option([0], 1.5), option([], 0.3)])
    await flushMicrotasks()

    expect(store.handHistory[0]!.mistakeCost).toBeCloseTo(0.625)
    expect(store.stats.totalEVLost).toBeCloseTo(0.625)
  })

  it('setDenomination after a completed hand starts a fresh session', async () => {
    const store = useGameStore()
    await playOneHand(store)
    expect(store.stats.handsPlayed).toBe(1)

    store.setDenomination(1.00)

    expect(store.denomination).toBe(1.00)
    expect(store.stats.handsPlayed).toBe(0)
    expect(store.handHistory).toHaveLength(0)
    expect(store.dealtDecks).toHaveLength(0)
    expect(store.credits).toBe(100)
  })

  it('keeps every completed hand in history past 500 hands', async () => {
    const store = useGameStore()
    for (let i = 0; i < 501; i++) {
      if (store.credits < store.coinsBet) store.insertCredits()
      await playOneHand(store)
    }

    expect(store.stats.handsPlayed).toBe(501)
    expect(store.handHistory).toHaveLength(501)
    expect(store.handHistory[store.handHistory.length - 1]!.handNumber).toBe(1)
  })

  it('finishing the hand after a mid-hand endSession refreshes the persona comparison', async () => {
    const store = useGameStore()
    await playOneHand(store)

    // Hand 2 dealt; the inactivity timeout ends the session while it is live
    store.deal()
    await vi.advanceTimersByTimeAsync(700)
    store.endSession()
    expect(store.personaResults[0]!.handsPlayed).toBe(1)

    // The player comes back and finishes the hand
    pendingResolvers[pendingResolvers.length - 1]!([option([], 0.5), option([0], 0.3)])
    await flushMicrotasks()
    store.draw()
    await vi.runAllTimersAsync()

    expect(store.sessionEnded).toBe(true)
    expect(store.personaResults[0]!.handsPlayed).toBe(2)
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
