import { describe, it, expect } from 'vitest'
import type { Card, Rank, Suit } from '../app/utils/cards'
import { describeHold, describeEvGap } from '../app/utils/holdDescription'

function c(rank: Rank, suit: Suit): Card {
  return { rank, suit, id: `${rank}${suit[0]}` }
}

describe('describeHold', () => {
  describe('two pair', () => {
    it('labels two pair as two pair, not a straight draw (7♣ 3♥ 7♥ 3♦ from a real hand)', () => {
      // Regression: ranks [3,3,7,7] span exactly 4, which fooled the
      // straight-draw check because it never required distinct ranks.
      const hold = [c(7, 'clubs'), c(3, 'hearts'), c(7, 'hearts'), c(3, 'diamonds')]
      expect(describeHold(hold, false)).toBe('Hold two pair — Sevens and Threes')
    })

    it('labels adjacent-rank two pair correctly (Jacks and Nines)', () => {
      const hold = [c(11, 'spades'), c(11, 'diamonds'), c(9, 'hearts'), c(9, 'clubs')]
      expect(describeHold(hold, false)).toBe('Hold two pair — Jacks and Nines')
    })

    it('labels wide two pair correctly (Kings and Threes)', () => {
      const hold = [c(13, 'spades'), c(13, 'diamonds'), c(3, 'hearts'), c(3, 'clubs')]
      expect(describeHold(hold, false)).toBe('Hold two pair — Kings and Threes')
    })
  })

  describe('straight draws', () => {
    it('labels a genuine open-ended 4 to a straight', () => {
      const hold = [c(5, 'clubs'), c(6, 'diamonds'), c(7, 'hearts'), c(8, 'spades')]
      expect(describeHold(hold, false)).toBe('Hold 4 to a straight')
    })

    it('labels a genuine inside 4 to a straight (span 4)', () => {
      const hold = [c(5, 'clubs'), c(6, 'diamonds'), c(8, 'hearts'), c(9, 'spades')]
      expect(describeHold(hold, false)).toBe('Hold 4 to a straight')
    })

    it('does not call trips + kicker a straight draw', () => {
      const hold = [c(5, 'clubs'), c(5, 'diamonds'), c(5, 'hearts'), c(8, 'spades')]
      expect(describeHold(hold, false)).not.toContain('straight')
    })
  })

  describe('existing labels (regression)', () => {
    it('labels a pair', () => {
      expect(describeHold([c(7, 'clubs'), c(7, 'hearts')], false)).toBe('Hold the pair of Sevens')
    })

    it('labels three of a kind', () => {
      expect(describeHold([c(7, 'clubs'), c(7, 'hearts'), c(7, 'diamonds')], false)).toBe('Hold three Sevens')
    })

    it('labels 4 to a flush', () => {
      const hold = [c(2, 'hearts'), c(6, 'hearts'), c(9, 'hearts'), c(13, 'hearts')]
      expect(describeHold(hold, false)).toBe('Hold 4 to a flush (Hearts)')
    })

    it('labels 3 to a flush', () => {
      const hold = [c(6, 'hearts'), c(9, 'hearts'), c(13, 'hearts')]
      expect(describeHold(hold, false)).toBe('Hold 3 to a flush (Hearts)')
    })

    it('names a royal draw for the royal, not the flush', () => {
      // Four to a royal is worth ~18.5 EV; calling it "4 to a flush" (~1.2)
      // taught the wrong hand
      const four = [c(14, 'spades'), c(13, 'spades'), c(12, 'spades'), c(11, 'spades')]
      expect(describeHold(four, false)).toBe('Hold 4 to a royal flush (Spades)')
      const three = [c(14, 'clubs'), c(11, 'clubs'), c(10, 'clubs')]
      expect(describeHold(three, false)).toBe('Hold 3 to a royal flush (Clubs)')
    })

    it('names a straight-flush draw, including the ace-low wheel', () => {
      const four = [c(6, 'spades'), c(7, 'spades'), c(8, 'spades'), c(9, 'spades')]
      expect(describeHold(four, false)).toBe('Hold 4 to a straight flush (Spades)')
      const three = [c(9, 'clubs'), c(10, 'clubs'), c(11, 'clubs')]
      expect(describeHold(three, false)).toBe('Hold 3 to a straight flush (Clubs)')
      const wheel = [c(14, 'hearts'), c(2, 'hearts'), c(3, 'hearts'), c(5, 'hearts')]
      expect(describeHold(wheel, false)).toBe('Hold 4 to a straight flush (Hearts)')
    })

    it('labels an ace-low straight draw', () => {
      const hold = [c(14, 'spades'), c(2, 'diamonds'), c(3, 'clubs'), c(4, 'hearts')]
      expect(describeHold(hold, false)).toBe('Hold 4 to a straight')
    })

    it('names a wild royal draw', () => {
      const hold = [c(13, 'hearts'), c(12, 'hearts'), c(11, 'hearts'), c(2, 'spades')]
      expect(describeHold(hold, true)).toBe('Hold 4 to a royal flush (Hearts) + 1 wild')
    })

    it('labels an empty hold', () => {
      expect(describeHold([], false)).toBe('Discard everything — draw 5 new cards')
    })

    it('labels a pat hand', () => {
      const hold = [c(7, 'clubs'), c(3, 'hearts'), c(5, 'hearts'), c(7, 'hearts'), c(3, 'diamonds')]
      expect(describeHold(hold, false)).toBe('Hold all 5 cards — pat hand')
    })

    it('treats a pair of 2s as a normal pair outside Deuces Wild', () => {
      expect(describeHold([c(2, 'clubs'), c(2, 'diamonds')], false)).toBe('Hold the pair of Twos')
    })
  })

  describe('deuces wild', () => {
    it('labels bare deuces', () => {
      expect(describeHold([c(2, 'clubs'), c(2, 'diamonds')], true)).toBe('Hold 2 deuces (wild)')
    })

    it('labels a pair plus a wild', () => {
      const hold = [c(7, 'clubs'), c(7, 'hearts'), c(2, 'spades')]
      expect(describeHold(hold, true)).toBe('Hold the pair of Sevens + 1 wild')
    })

    it('labels a wild straight draw with distinct naturals', () => {
      const hold = [c(5, 'clubs'), c(6, 'diamonds'), c(8, 'hearts'), c(2, 'spades')]
      expect(describeHold(hold, true)).toBe('Hold 4 to a straight + 1 wild')
    })

    it('does not call paired naturals plus a wild a straight draw', () => {
      const hold = [c(5, 'clubs'), c(5, 'diamonds'), c(8, 'hearts'), c(2, 'spades')]
      expect(describeHold(hold, true)).not.toContain('straight')
    })
  })
})

describe('describeEvGap', () => {
  it('reports the gap as a percentage of the optimal EV (real hand: two pair 122/47 vs hold-all 2.0)', () => {
    // Regression: the raw EV delta (0.5957) was multiplied by 100 and
    // presented as "59.6% worse". The honest relative gap is 23.0%.
    expect(describeEvGap(122 / 47, 2.0)).toBe('Next best option is 23.0% worse in EV.')
  })

  it('calls a tiny gap marginal', () => {
    expect(describeEvGap(1.0005, 1.0)).toBe('Very close to the next-best option — a marginal edge.')
  })

  it('calls a zero gap marginal', () => {
    expect(describeEvGap(1.0, 1.0)).toBe('Very close to the next-best option — a marginal edge.')
  })
})
