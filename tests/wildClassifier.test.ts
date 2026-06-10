import { describe, it, expect } from 'vitest'
import type { Card, Rank, Suit } from '../app/utils/cards'
import { classifyDeucesWild } from '../app/utils/wildClassifier'

function c(rank: Rank, suit: Suit): Card {
  return { rank, suit, id: `${rank}${suit[0]}` }
}

describe('classifyDeucesWild — ace-low straights', () => {
  // The wheel is A-2-3-4-5. In Deuces Wild every 2 is wild, so the 2 slot
  // MUST consume a wild. A-3-4-5-6 is never a straight (not consecutive).

  it('A-3-4-5-6 offsuit with no wilds is Nothing, not a straight', () => {
    const hand = [c(14, 'spades'), c(3, 'diamonds'), c(4, 'hearts'), c(5, 'clubs'), c(6, 'spades')]
    expect(classifyDeucesWild(hand)).toBe('Nothing')
  })

  it('A-4-5-6 + one deuce is Nothing (no straight uses all five cards)', () => {
    const hand = [c(14, 'spades'), c(4, 'diamonds'), c(5, 'hearts'), c(6, 'clubs'), c(2, 'spades')]
    expect(classifyDeucesWild(hand)).toBe('Nothing')
  })

  it('suited A-4-5-6 + one deuce is a Flush, not a Straight Flush', () => {
    const hand = [c(14, 'spades'), c(4, 'spades'), c(5, 'spades'), c(6, 'spades'), c(2, 'hearts')]
    expect(classifyDeucesWild(hand)).toBe('Flush')
  })

  it('A-3-4-6 + one deuce is Nothing', () => {
    const hand = [c(14, 'spades'), c(3, 'diamonds'), c(4, 'hearts'), c(6, 'clubs'), c(2, 'spades')]
    expect(classifyDeucesWild(hand)).toBe('Nothing')
  })

  it('A-4-6 + two deuces is not a straight (two wilds + ace = trip aces)', () => {
    const hand = [c(14, 'spades'), c(4, 'diamonds'), c(6, 'clubs'), c(2, 'spades'), c(2, 'hearts')]
    expect(classifyDeucesWild(hand)).toBe('Three of a Kind')
  })

  it('A-3-4-5 + one deuce IS a straight (wild plays the 2)', () => {
    const hand = [c(14, 'spades'), c(3, 'diamonds'), c(4, 'hearts'), c(5, 'clubs'), c(2, 'spades')]
    expect(classifyDeucesWild(hand)).toBe('Straight')
  })

  it('suited A-3-4-5 + one deuce IS a straight flush', () => {
    const hand = [c(14, 'spades'), c(3, 'spades'), c(4, 'spades'), c(5, 'spades'), c(2, 'hearts')]
    expect(classifyDeucesWild(hand)).toBe('Straight Flush')
  })

  it('A-4-5 + two deuces IS a straight (wilds play 2 and 3)', () => {
    const hand = [c(14, 'spades'), c(4, 'diamonds'), c(5, 'hearts'), c(2, 'clubs'), c(2, 'spades')]
    expect(classifyDeucesWild(hand)).toBe('Straight')
  })
})

describe('classifyDeucesWild — regression coverage', () => {
  it('classifies four deuces', () => {
    const hand = [c(2, 'spades'), c(2, 'diamonds'), c(2, 'hearts'), c(2, 'clubs'), c(9, 'spades')]
    expect(classifyDeucesWild(hand)).toBe('Four Deuces')
  })

  it('classifies a natural royal flush', () => {
    const hand = [c(10, 'spades'), c(11, 'spades'), c(12, 'spades'), c(13, 'spades'), c(14, 'spades')]
    expect(classifyDeucesWild(hand)).toBe('Natural Royal Flush')
  })

  it('classifies a wild royal flush', () => {
    const hand = [c(10, 'spades'), c(11, 'spades'), c(12, 'spades'), c(2, 'hearts'), c(14, 'spades')]
    expect(classifyDeucesWild(hand)).toBe('Wild Royal Flush')
  })

  it('classifies five of a kind (trips + two wilds)', () => {
    const hand = [c(9, 'spades'), c(9, 'diamonds'), c(9, 'hearts'), c(2, 'clubs'), c(2, 'spades')]
    expect(classifyDeucesWild(hand)).toBe('Five of a Kind')
  })

  it('classifies four of a kind (pair + two wilds)', () => {
    const hand = [c(9, 'spades'), c(9, 'diamonds'), c(7, 'hearts'), c(2, 'clubs'), c(2, 'spades')]
    expect(classifyDeucesWild(hand)).toBe('Four of a Kind')
  })

  it('classifies a full house (two natural pairs + wild)', () => {
    const hand = [c(9, 'spades'), c(9, 'diamonds'), c(7, 'hearts'), c(7, 'clubs'), c(2, 'spades')]
    expect(classifyDeucesWild(hand)).toBe('Full House')
  })

  it('classifies a mid straight with wilds filling gaps (9-J-K + two deuces)', () => {
    const hand = [c(9, 'spades'), c(11, 'diamonds'), c(13, 'hearts'), c(2, 'clubs'), c(2, 'spades')]
    expect(classifyDeucesWild(hand)).toBe('Straight')
  })

  it('classifies 3-4-5-6 + deuce as a straight', () => {
    const hand = [c(3, 'spades'), c(4, 'diamonds'), c(5, 'hearts'), c(6, 'clubs'), c(2, 'spades')]
    expect(classifyDeucesWild(hand)).toBe('Straight')
  })

  it('a paired straight draw is not a straight (5-5-6-7 + wild)', () => {
    const hand = [c(5, 'spades'), c(5, 'diamonds'), c(6, 'hearts'), c(7, 'clubs'), c(2, 'spades')]
    expect(classifyDeucesWild(hand)).toBe('Three of a Kind')
  })

  it('classifies three of a kind (pair + one wild)', () => {
    const hand = [c(9, 'spades'), c(9, 'diamonds'), c(5, 'hearts'), c(7, 'clubs'), c(2, 'spades')]
    expect(classifyDeucesWild(hand)).toBe('Three of a Kind')
  })

  it('pairs do not pay (no-wild pair is Nothing)', () => {
    const hand = [c(9, 'spades'), c(9, 'diamonds'), c(5, 'hearts'), c(7, 'clubs'), c(13, 'spades')]
    expect(classifyDeucesWild(hand)).toBe('Nothing')
  })

  it('classifies a no-wild 10-to-ace straight', () => {
    const hand = [c(10, 'spades'), c(11, 'diamonds'), c(12, 'hearts'), c(13, 'clubs'), c(14, 'spades')]
    expect(classifyDeucesWild(hand)).toBe('Straight')
  })
})
