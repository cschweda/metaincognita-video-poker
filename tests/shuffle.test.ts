import { describe, it, expect } from 'vitest'
import { createDeck, shuffle } from '../app/utils/cards'

describe('createDeck', () => {
  it('produces 52 cards', () => {
    expect(createDeck()).toHaveLength(52)
  })

  it('has no duplicate ids', () => {
    const ids = createDeck().map(c => c.id)
    expect(new Set(ids).size).toBe(52)
  })

  it('contains 13 cards per suit', () => {
    const deck = createDeck()
    for (const suit of ['spades', 'hearts', 'diamonds', 'clubs'] as const) {
      expect(deck.filter(c => c.suit === suit)).toHaveLength(13)
    }
  })
})

describe('shuffle', () => {
  it('returns all 52 cards (no loss or duplication)', () => {
    const deck = createDeck()
    const shuffled = shuffle(deck)
    expect(shuffled).toHaveLength(52)
    const ids = shuffled.map(c => c.id).sort()
    const origIds = deck.map(c => c.id).sort()
    expect(ids).toEqual(origIds)
  })

  it('does not mutate the original deck', () => {
    const deck = createDeck()
    const original = deck.map(c => c.id)
    shuffle(deck)
    expect(deck.map(c => c.id)).toEqual(original)
  })

  it('produces different orderings across calls', () => {
    const deck = createDeck()
    const results = new Set<string>()
    for (let i = 0; i < 20; i++) {
      results.add(shuffle(deck).map(c => c.id).join(','))
    }
    // 20 shuffles of 52 cards should all be unique
    expect(results.size).toBe(20)
  })

  // ── Positional uniformity (chi-squared) ──
  // Each card should appear at each position with equal probability.
  // Over N shuffles of a 52-card deck, expected count per (card, position) = N/52.
  // Chi-squared with 51 df: p < 0.001 critical value ≈ 86.66.
  // We test a sample of 4 positions to keep runtime reasonable.
  it('distributes cards uniformly across positions (chi-squared, 50k shuffles)', () => {
    const deck = createDeck()
    const N = 50_000
    const deckSize = 52
    const expected = N / deckSize

    // Track how many times each card lands at positions 0, 12, 25, 51
    const testPositions = [0, 12, 25, 51]
    // positionCounts[posIdx][cardId] = count
    const positionCounts: Map<string, number>[] = testPositions.map(() => new Map())

    for (let i = 0; i < N; i++) {
      const s = shuffle(deck)
      for (let p = 0; p < testPositions.length; p++) {
        const cardId = s[testPositions[p]!]!.id
        positionCounts[p]!.set(cardId, (positionCounts[p]!.get(cardId) ?? 0) + 1)
      }
    }

    // Chi-squared critical value for 51 df at p < 0.001
    const criticalValue = 86.66

    for (let p = 0; p < testPositions.length; p++) {
      let chiSq = 0
      for (const card of deck) {
        const observed = positionCounts[p]!.get(card.id) ?? 0
        chiSq += (observed - expected) ** 2 / expected
      }
      expect(
        chiSq,
        `Position ${testPositions[p]} failed chi-squared (χ²=${chiSq.toFixed(2)}, critical=${criticalValue})`
      ).toBeLessThan(criticalValue)
    }
  })

  // ── Suit distribution in first 5 cards (deal fairness) ──
  // In a fair shuffle, the expected number of each suit in the first 5 cards
  // follows a hypergeometric distribution. Over many deals, the mean count for
  // any suit in 5 cards = 5 * 13/52 = 1.25.
  it('deals suits fairly in the first 5 cards (50k deals)', () => {
    const deck = createDeck()
    const N = 50_000
    const suitCounts: Record<string, number> = { spades: 0, hearts: 0, diamonds: 0, clubs: 0 }

    for (let i = 0; i < N; i++) {
      const hand = shuffle(deck).slice(0, 5)
      for (const card of hand) {
        suitCounts[card.suit]!++
      }
    }

    const expectedPerSuit = N * 5 * (13 / 52) // = N * 1.25
    for (const suit of Object.keys(suitCounts)) {
      const ratio = suitCounts[suit]! / expectedPerSuit
      // Should be within 2% of expected
      expect(
        ratio,
        `${suit} ratio ${ratio.toFixed(4)} deviates from 1.0`
      ).toBeGreaterThan(0.98)
      expect(ratio).toBeLessThan(1.02)
    }
  })

  // ── Adjacent card independence ──
  // The card at position i should not predict the card at position i+1.
  // We check that consecutive cards don't share the same suit more than expected.
  // Probability two consecutive cards share a suit = 12/51 ≈ 0.2353.
  it('consecutive cards are independent (suit adjacency, 50k shuffles)', () => {
    const deck = createDeck()
    const N = 50_000
    let sameSuitPairs = 0
    const totalPairs = N * 51

    for (let i = 0; i < N; i++) {
      const s = shuffle(deck)
      for (let j = 0; j < 51; j++) {
        if (s[j]!.suit === s[j + 1]!.suit) sameSuitPairs++
      }
    }

    const observedRate = sameSuitPairs / totalPairs
    const expectedRate = 12 / 51 // ≈ 0.2353
    // Should be within 1% of expected
    expect(
      observedRate,
      `Same-suit adjacency rate ${observedRate.toFixed(4)} vs expected ${expectedRate.toFixed(4)}`
    ).toBeGreaterThan(expectedRate - 0.01)
    expect(observedRate).toBeLessThan(expectedRate + 0.01)
  })

  // ── First card uniformity ──
  // Each of the 52 cards should appear as the first card with equal probability.
  it('first card is uniformly distributed (50k shuffles)', () => {
    const deck = createDeck()
    const N = 50_000
    const counts = new Map<string, number>()

    for (let i = 0; i < N; i++) {
      const first = shuffle(deck)[0]!.id
      counts.set(first, (counts.get(first) ?? 0) + 1)
    }

    const expected = N / 52
    let chiSq = 0
    for (const card of deck) {
      const observed = counts.get(card.id) ?? 0
      chiSq += (observed - expected) ** 2 / expected
    }

    // Chi-squared critical value for 51 df at p < 0.001 ≈ 86.66
    expect(
      chiSq,
      `First-card chi-squared ${chiSq.toFixed(2)} exceeds critical value`
    ).toBeLessThan(86.66)
  })
})
