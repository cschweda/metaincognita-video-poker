import { describe, it, expect } from 'vitest'
import type { Card, Rank, Suit } from '../app/utils/cards'
import { replayHandsThroughPersona } from '../app/utils/botPersonas'
import { PAY_TABLES } from '../app/utils/payTables'

function c(rank: Rank, suit: Suit): Card {
  return { rank, suit, id: `${rank}${suit[0]}` }
}

describe('replayHandsThroughPersona — perfect-pat', () => {
  it('uses the recorded exact-optimal hold when provided', () => {
    // 4-5-6-8 + K: the heuristic strategy table holds the inside straight,
    // but exact EV says hold the king alone (verified: 0.4724 vs 0.3404).
    // The gameplay analysis records optimalHeld = [4]; Pat must use it.
    const cards = [c(4, 'spades'), c(5, 'diamonds'), c(6, 'hearts'), c(8, 'clubs'), c(13, 'spades')]
    // Holding index 4 draws the first four remaining cards → four kings.
    const remaining = [c(13, 'diamonds'), c(13, 'hearts'), c(13, 'clubs'), c(12, 'spades'), c(9, 'diamonds')]

    const result = replayHandsThroughPersona(
      'perfect-pat',
      [{ cards, remaining, optimalHeld: [4] }],
      PAY_TABLES['job-9-6']!,
      5
    )

    expect(result.handResults[0]!.handName).toBe('Four of a Kind')
    expect(result.totalPayout).toBe(125)
  })

  it('falls back to the strategy table when no recorded hold exists', () => {
    // Pair of jacks: strategy table holds the pair; draw keeps it a pair.
    const cards = [c(11, 'spades'), c(11, 'diamonds'), c(7, 'hearts'), c(5, 'clubs'), c(3, 'spades')]
    const remaining = [c(4, 'diamonds'), c(9, 'clubs'), c(10, 'hearts'), c(6, 'spades'), c(8, 'diamonds')]

    const result = replayHandsThroughPersona(
      'perfect-pat',
      [{ cards, remaining }],
      PAY_TABLES['job-9-6']!,
      5
    )

    expect(result.handResults[0]!.handName).toBe('Jacks or Better')
    expect(result.totalPayout).toBe(5)
  })

  it('replays each hand under the pay table it was dealt on', () => {
    // Pat full house: pays 9 per coin on job-9-6 but 7 per coin on job-7-5
    const fullHouse = [c(9, 'spades'), c(9, 'hearts'), c(9, 'diamonds'), c(5, 'clubs'), c(5, 'spades')]
    const result = replayHandsThroughPersona(
      'perfect-pat',
      [
        { cards: fullHouse, remaining: [], optimalHeld: [0, 1, 2, 3, 4], payTableId: 'job-9-6' },
        { cards: fullHouse, remaining: [], optimalHeld: [0, 1, 2, 3, 4], payTableId: 'job-7-5' }
      ],
      PAY_TABLES['job-9-6']!,
      5
    )

    expect(result.totalPayout).toBe(45 + 35)
  })

  it('other personas ignore the recorded optimal hold', () => {
    // Gut-Feel Gary should still make his own (mistaken) choice even when
    // optimalHeld is present: with trips he holds a kicker too.
    const cards = [c(9, 'spades'), c(9, 'diamonds'), c(9, 'hearts'), c(5, 'clubs'), c(13, 'spades')]
    // Gary holds trips + K kicker (indices 0,1,2,4) and draws one card.
    const remaining = [c(3, 'diamonds'), c(4, 'clubs')]

    const result = replayHandsThroughPersona(
      'gut-feel-gary',
      [{ cards, remaining, optimalHeld: [0, 1, 2] }],
      PAY_TABLES['job-9-6']!,
      5
    )

    // Trips + kicker + one drawn card stays three of a kind
    expect(result.handResults[0]!.handName).toBe('Three of a Kind')
  })
})
