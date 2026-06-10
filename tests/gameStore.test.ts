import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameStore } from '../app/stores/game'

describe('game store — exact optimal hold recording', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('records the brute-force optimal hold on the dealt deck entry for persona replay', async () => {
    const store = useGameStore()
    store.deal()
    await vi.runAllTimersAsync()

    expect(store.phase).toBe('dealt')
    expect(store.optimalPlay).not.toBeNull()
    expect(store.dealtDecks).toHaveLength(1)
    expect(store.dealtDecks[0]!.optimalHeld).toEqual(store.optimalPlay!.heldIndices)
  })
})
