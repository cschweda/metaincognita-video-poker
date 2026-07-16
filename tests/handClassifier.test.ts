import { describe, it, expect } from 'vitest'
import type { Card, Rank, Suit } from '../app/utils/cards'
import { classifyHand, classifyBonusHand, classifyDDBHand } from '../app/utils/handClassifier'
import { PAY_TABLES } from '../app/utils/payTables'

function c(rank: Rank, suit: Suit): Card {
  return { rank, suit, id: `${rank}${suit[0]}` }
}

describe('classifyHand — standard (Jacks or Better)', () => {
  it('classifies a royal flush', () => {
    const hand = [c(10, 'hearts'), c(11, 'hearts'), c(12, 'hearts'), c(13, 'hearts'), c(14, 'hearts')]
    expect(classifyHand(hand)).toBe('Royal Flush')
  })

  it('classifies a straight flush', () => {
    const hand = [c(5, 'clubs'), c(6, 'clubs'), c(7, 'clubs'), c(8, 'clubs'), c(9, 'clubs')]
    expect(classifyHand(hand)).toBe('Straight Flush')
  })

  it('classifies the steel wheel (suited A-2-3-4-5) as a straight flush, not a royal', () => {
    const hand = [c(14, 'spades'), c(2, 'spades'), c(3, 'spades'), c(4, 'spades'), c(5, 'spades')]
    expect(classifyHand(hand)).toBe('Straight Flush')
  })

  it('classifies four of a kind', () => {
    const hand = [c(9, 'spades'), c(9, 'hearts'), c(9, 'diamonds'), c(9, 'clubs'), c(13, 'spades')]
    expect(classifyHand(hand)).toBe('Four of a Kind')
  })

  it('classifies a full house', () => {
    const hand = [c(8, 'spades'), c(8, 'hearts'), c(8, 'diamonds'), c(4, 'clubs'), c(4, 'spades')]
    expect(classifyHand(hand)).toBe('Full House')
  })

  it('classifies a flush', () => {
    const hand = [c(2, 'diamonds'), c(6, 'diamonds'), c(9, 'diamonds'), c(11, 'diamonds'), c(13, 'diamonds')]
    expect(classifyHand(hand)).toBe('Flush')
  })

  it('classifies an offsuit straight', () => {
    const hand = [c(6, 'spades'), c(7, 'hearts'), c(8, 'diamonds'), c(9, 'clubs'), c(10, 'spades')]
    expect(classifyHand(hand)).toBe('Straight')
  })

  it('classifies the offsuit wheel A-2-3-4-5 as a straight', () => {
    const hand = [c(14, 'spades'), c(2, 'hearts'), c(3, 'diamonds'), c(4, 'clubs'), c(5, 'spades')]
    expect(classifyHand(hand)).toBe('Straight')
  })

  it('classifies offsuit broadway 10-J-Q-K-A as a straight', () => {
    const hand = [c(10, 'spades'), c(11, 'hearts'), c(12, 'diamonds'), c(13, 'clubs'), c(14, 'spades')]
    expect(classifyHand(hand)).toBe('Straight')
  })

  it('does NOT treat A-3-4-5-6 as a straight (ace is high or low, never mid)', () => {
    const hand = [c(14, 'spades'), c(3, 'hearts'), c(4, 'diamonds'), c(5, 'clubs'), c(6, 'spades')]
    expect(classifyHand(hand)).toBe('Nothing')
  })

  it('does NOT treat Q-K-A-2-3 as a wraparound straight', () => {
    const hand = [c(12, 'spades'), c(13, 'hearts'), c(14, 'diamonds'), c(2, 'clubs'), c(3, 'spades')]
    expect(classifyHand(hand)).toBe('Nothing')
  })

  it('classifies three of a kind', () => {
    const hand = [c(7, 'spades'), c(7, 'hearts'), c(7, 'diamonds'), c(2, 'clubs'), c(13, 'spades')]
    expect(classifyHand(hand)).toBe('Three of a Kind')
  })

  it('classifies two pair', () => {
    const hand = [c(4, 'spades'), c(4, 'hearts'), c(9, 'diamonds'), c(9, 'clubs'), c(13, 'spades')]
    expect(classifyHand(hand)).toBe('Two Pair')
  })

  it.each([
    [11 as Rank, 'Jacks'],
    [12 as Rank, 'Queens'],
    [13 as Rank, 'Kings'],
    [14 as Rank, 'Aces']
  ])('a pair of rank %i (%s) pays Jacks or Better', (rank) => {
    const hand = [c(rank, 'spades'), c(rank, 'hearts'), c(3, 'diamonds'), c(7, 'clubs'), c(9, 'spades')]
    expect(classifyHand(hand)).toBe('Jacks or Better')
  })

  it('a pair of 10s is Nothing — the jacks-or-better boundary', () => {
    const hand = [c(10, 'spades'), c(10, 'hearts'), c(3, 'diamonds'), c(7, 'clubs'), c(9, 'spades')]
    expect(classifyHand(hand)).toBe('Nothing')
  })

  it('classifies an unpaired junk hand as Nothing', () => {
    const hand = [c(2, 'spades'), c(5, 'hearts'), c(8, 'diamonds'), c(11, 'clubs'), c(13, 'spades')]
    expect(classifyHand(hand)).toBe('Nothing')
  })

  it('returns Nothing for a non-5-card input', () => {
    const hand = [c(14, 'spades'), c(14, 'hearts'), c(14, 'diamonds'), c(14, 'clubs')]
    expect(classifyHand(hand)).toBe('Nothing')
  })
})

describe('classifyBonusHand — quad rank groups', () => {
  function quad(rank: Rank, kicker: Rank): Card[] {
    return [c(rank, 'spades'), c(rank, 'hearts'), c(rank, 'diamonds'), c(rank, 'clubs'), c(kicker, 'spades')]
  }

  it('four aces', () => {
    expect(classifyBonusHand(quad(14, 9))).toBe('Four Aces')
  })

  it('four 2s and four 4s are the 2s-4s group', () => {
    expect(classifyBonusHand(quad(2, 13))).toBe('Four 2s-4s')
    expect(classifyBonusHand(quad(4, 7))).toBe('Four 2s-4s')
  })

  it('four 5s and four kings are the 5s-Ks group (boundaries)', () => {
    expect(classifyBonusHand(quad(5, 14))).toBe('Four 5s-Ks')
    expect(classifyBonusHand(quad(13, 2))).toBe('Four 5s-Ks')
  })

  it('non-quad hands pass through to the standard classification', () => {
    const fullHouse = [c(8, 'spades'), c(8, 'hearts'), c(8, 'diamonds'), c(4, 'clubs'), c(4, 'spades')]
    expect(classifyBonusHand(fullHouse)).toBe('Full House')
  })
})

describe('classifyDDBHand — kicker-differentiated quads', () => {
  function quad(rank: Rank, kicker: Rank): Card[] {
    return [c(rank, 'spades'), c(rank, 'hearts'), c(rank, 'diamonds'), c(rank, 'clubs'), c(kicker, 'spades')]
  }

  it('four aces with a 2-4 kicker is the 400-coin class', () => {
    expect(classifyDDBHand(quad(14, 2))).toBe('Four Aces + 2-4')
    expect(classifyDDBHand(quad(14, 4))).toBe('Four Aces + 2-4')
  })

  it('four aces with a 5-K kicker is the 160-coin class (5 is the boundary)', () => {
    expect(classifyDDBHand(quad(14, 5))).toBe('Four Aces + 5-K')
    expect(classifyDDBHand(quad(14, 13))).toBe('Four Aces + 5-K')
  })

  it('four 2s-4s with an A-4 kicker', () => {
    expect(classifyDDBHand(quad(2, 14))).toBe('Four 2s-4s + A-4')
    expect(classifyDDBHand(quad(3, 2))).toBe('Four 2s-4s + A-4')
    expect(classifyDDBHand(quad(4, 3))).toBe('Four 2s-4s + A-4')
  })

  it('four 2s-4s with a 5-K kicker (5 is the boundary)', () => {
    expect(classifyDDBHand(quad(4, 5))).toBe('Four 2s-4s + 5-K')
    expect(classifyDDBHand(quad(2, 13))).toBe('Four 2s-4s + 5-K')
  })

  it('four 5s-Ks regardless of kicker, including an ace kicker', () => {
    expect(classifyDDBHand(quad(5, 14))).toBe('Four 5s-Ks')
    expect(classifyDDBHand(quad(11, 2))).toBe('Four 5s-Ks')
    expect(classifyDDBHand(quad(13, 14))).toBe('Four 5s-Ks')
  })

  it('non-quad hands pass through to the standard classification', () => {
    const twoPair = [c(4, 'spades'), c(4, 'hearts'), c(9, 'diamonds'), c(9, 'clubs'), c(13, 'spades')]
    expect(classifyDDBHand(twoPair)).toBe('Two Pair')
  })
})

describe('classifier output ↔ pay table row integrity', () => {
  // Every paying class a classifier can emit must exist verbatim as a row
  // in the pay tables that use that classifier — a renamed row silently
  // zeroes the payout via getPayForHand's find-by-name.
  const STANDARD_CLASSES = [
    'Royal Flush', 'Straight Flush', 'Four of a Kind', 'Full House', 'Flush',
    'Straight', 'Three of a Kind', 'Two Pair', 'Jacks or Better'
  ]
  const BONUS_CLASSES = [
    'Royal Flush', 'Straight Flush', 'Four Aces', 'Four 2s-4s', 'Four 5s-Ks',
    'Full House', 'Flush', 'Straight', 'Three of a Kind', 'Two Pair', 'Jacks or Better'
  ]
  const DDB_CLASSES = [
    'Royal Flush', 'Straight Flush', 'Four Aces + 2-4', 'Four Aces + 5-K',
    'Four 2s-4s + A-4', 'Four 2s-4s + 5-K', 'Four 5s-Ks',
    'Full House', 'Flush', 'Straight', 'Three of a Kind', 'Two Pair', 'Jacks or Better'
  ]
  const CLASSES_BY_CLASSIFIER: Record<string, string[]> = {
    standard: STANDARD_CLASSES,
    bonus: BONUS_CLASSES,
    ddb: DDB_CLASSES
  }

  for (const table of Object.values(PAY_TABLES)) {
    const classes = CLASSES_BY_CLASSIFIER[table.classifier]
    if (!classes) continue // deucesWild is covered by wildClassifier.test.ts
    it(`${table.id} has a row for every ${table.classifier} classifier output`, () => {
      const rowNames = new Set(table.hands.map(h => h.name))
      for (const cls of classes) {
        expect(rowNames, `missing row "${cls}"`).toContain(cls)
      }
    })
  }
})
