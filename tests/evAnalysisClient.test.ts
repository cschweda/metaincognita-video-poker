import { describe, it, expect } from 'vitest'
import { createDeck } from '../app/utils/cards'
import { analyzeHand } from '../app/utils/evCalculator'
import { PAY_TABLES } from '../app/utils/payTables'
import { analyzeHandAsync } from '../app/utils/evAnalysisClient'

describe('analyzeHandAsync', () => {
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
