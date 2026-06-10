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

describe('game store — async EV analysis', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    pendingResolvers.length = 0
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('populates analysis when it resolves before the draw (normal flow)', async () => {
    const store = useGameStore()
    store.deal()
    await vi.advanceTimersByTimeAsync(700)
    expect(store.phase).toBe('dealt')

    // Worker responds while the player is thinking
    pendingResolvers[0]!([option([1, 2], 2.0), option([0], 1.5), option([], 0.3)])
    await flushMicrotasks()

    expect(store.optimalPlay?.heldIndices).toEqual([1, 2])
    expect(store.dealtDecks[0]!.optimalHeld).toEqual([1, 2])

    // Player holds card 0 (a mistake: EV 1.5 vs optimal 2.0) and draws
    store.toggleHold(0)
    store.draw()
    await vi.runAllTimersAsync()

    expect(store.phase).toBe('result')
    const entry = store.handHistory[0]!
    expect(entry.optimalHeld).toEqual([1, 2])
    expect(entry.playerEV).toBeCloseTo(1.5)
    expect(entry.optimalEV).toBeCloseTo(2.0)
    // (2.0 - 1.5) EV/coin × 5 coins × $0.25 denom
    expect(entry.mistakeCost).toBeCloseTo(0.625)
    expect(store.wasOptimal).toBe(false)
    expect(store.stats.totalMistakes).toBe(1)
    expect(store.stats.totalEVLost).toBeCloseTo(0.625)
  })

  it('reconciles history and stats when the draw beats the analysis (race)', async () => {
    const store = useGameStore()
    store.deal()
    await vi.advanceTimersByTimeAsync(700)
    expect(store.phase).toBe('dealt')

    // Player races ahead: holds card 0 and draws before analysis arrives
    store.toggleHold(0)
    store.draw()
    await vi.runAllTimersAsync()

    expect(store.phase).toBe('result')
    expect(store.handHistory).toHaveLength(1)
    // Analysis not in yet — entry recorded without optimal data
    expect(store.handHistory[0]!.optimalHeld).toEqual([])
    expect(store.stats.totalMistakes).toBe(0)

    // Worker finally responds
    pendingResolvers[0]!([option([1, 2], 2.0), option([0], 1.5), option([], 0.3)])
    await flushMicrotasks()

    const entry = store.handHistory[0]!
    expect(entry.optimalHeld).toEqual([1, 2])
    expect(entry.playerEV).toBeCloseTo(1.5)
    expect(entry.optimalEV).toBeCloseTo(2.0)
    expect(entry.mistakeCost).toBeCloseTo(0.625)
    expect(store.wasOptimal).toBe(false)
    expect(store.stats.totalMistakes).toBe(1)
    expect(store.stats.totalEVLost).toBeCloseTo(0.625)
    expect(store.dealtDecks[0]!.optimalHeld).toEqual([1, 2])
  })

  it('drops a stale analysis after the session resets', async () => {
    const store = useGameStore()
    store.deal()
    await vi.advanceTimersByTimeAsync(700)

    store.resetSession()

    // Old deal's analysis arrives after the reset — must be ignored
    pendingResolvers[0]!([option([1, 2], 2.0)])
    await flushMicrotasks()

    expect(store.allHoldOptions).toEqual([])
    expect(store.optimalPlay).toBeNull()
  })
})
