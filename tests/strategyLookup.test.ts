import { describe, it, expect } from 'vitest'
import type { Card, Rank, Suit } from '../app/utils/cards'
import type { PayTableDef } from '../app/utils/payTables'
import { createDeck, cardLabel, shuffle } from '../app/utils/cards'
import { makeRng, prngInt } from '../app/utils/prng'
import { analyzeHand } from '../app/utils/evCalculator'
import { fastOptimalHold } from '../app/utils/strategyLookup'
import { classifyForPayTable } from '../app/utils/classify'
import { PAY_TABLES, getPayForHand } from '../app/utils/payTables'

/**
 * The strategy tables are graded against the brute-force EV calculator,
 * which enumerates every possible draw and is mathematically exact.
 * For each hand, the table's chosen hold must match the exact-optimal
 * hold's EV (ties by EV are fine — the indices may differ).
 */

function c(rank: Rank, suit: Suit): Card {
  return { rank, suit, id: `${rank}${suit[0]}` }
}

function evOfHold(hand: Card[], payTableId: string, heldIndices: number[]) {
  const pt = PAY_TABLES[payTableId]!
  const dealtIds = new Set(hand.map(h => h.id))
  const remaining = createDeck().filter(card => !dealtIds.has(card.id))
  const options = analyzeHand(hand, pt, remaining, 5)
  const chosen = options.find(o =>
    o.heldIndices.length === heldIndices.length
    && o.heldIndices.every(i => heldIndices.includes(i))
  )!
  return { chosenEV: chosen.expectedValue, optimalEV: options[0]!.expectedValue, optimal: options[0]! }
}

function expectOptimal(payTableId: string, hand: Card[]) {
  const held = fastOptimalHold(hand, PAY_TABLES[payTableId]!)
  const { chosenEV, optimalEV, optimal } = evOfHold(hand, payTableId, held)
  expect(
    chosenEV,
    `held [${held.map(i => cardLabel(hand[i]!)).join(' ')}] EV=${chosenEV.toFixed(4)}, `
    + `optimal [${optimal.heldIndices.map(i => cardLabel(hand[i]!)).join(' ')}] EV=${optimalEV.toFixed(4)}`
  ).toBeCloseTo(optimalEV, 6)
}

describe('Deuces Wild strategy vs exact EV', () => {
  it('holds a made wild royal with 2 deuces pat', () => {
    expectOptimal('deuces-wild-full', [c(2, 'spades'), c(2, 'hearts'), c(12, 'hearts'), c(11, 'hearts'), c(10, 'hearts')])
  })

  it('holds a made wild royal with 1 deuce pat', () => {
    expectOptimal('deuces-wild-full', [c(2, 'spades'), c(13, 'hearts'), c(12, 'hearts'), c(11, 'hearts'), c(10, 'hearts')])
  })

  it('holds a pat straight flush with 1 deuce', () => {
    expectOptimal('deuces-wild-full', [c(2, 'spades'), c(5, 'hearts'), c(6, 'hearts'), c(7, 'hearts'), c(8, 'hearts')])
  })

  it('discards the kicker with quads (pair + 2 deuces) to draw for five of a kind', () => {
    expectOptimal('deuces-wild-full', [c(2, 'spades'), c(2, 'hearts'), c(9, 'spades'), c(9, 'diamonds'), c(6, 'clubs')])
  })

  it('discards the kicker with quads (trips + 1 deuce)', () => {
    expectOptimal('deuces-wild-full', [c(2, 'spades'), c(9, 'spades'), c(9, 'diamonds'), c(9, 'hearts'), c(6, 'clubs')])
  })

  it('discards the kicker with natural quads (0 deuces)', () => {
    expectOptimal('deuces-wild-full', [c(9, 'spades'), c(9, 'diamonds'), c(9, 'hearts'), c(9, 'clubs'), c(6, 'clubs')])
  })

  it('breaks a pat five of a kind to hold 3 deuces alone (15.06 vs 15.00 exact)', () => {
    expectOptimal('deuces-wild-full', [c(2, 'spades'), c(2, 'hearts'), c(2, 'diamonds'), c(9, 'spades'), c(9, 'clubs')])
  })

  it('holds a made wild royal with 3 deuces + 2 suited royals', () => {
    expectOptimal('deuces-wild-full', [c(2, 'spades'), c(2, 'hearts'), c(2, 'diamonds'), c(12, 'clubs'), c(10, 'clubs')])
  })

  it('holds a pat straight with 1 deuce', () => {
    expectOptimal('deuces-wild-full', [c(2, 'spades'), c(5, 'hearts'), c(6, 'diamonds'), c(7, 'clubs'), c(8, 'hearts')])
  })

  it('holds a pat flush with 1 deuce', () => {
    expectOptimal('deuces-wild-full', [c(2, 'spades'), c(3, 'hearts'), c(8, 'hearts'), c(11, 'hearts'), c(13, 'hearts')])
  })

  it('prefers 4 to a wild royal over a pat flush with 1 deuce', () => {
    expectOptimal('deuces-wild-full', [c(2, 'spades'), c(14, 'hearts'), c(13, 'hearts'), c(12, 'hearts'), c(7, 'hearts')])
  })

  it('holds only the deuces with 2 deuces and unconnected naturals', () => {
    expectOptimal('deuces-wild-full', [c(2, 'spades'), c(2, 'hearts'), c(4, 'spades'), c(9, 'diamonds'), c(13, 'clubs')])
  })
})

describe('Jacks or Better strategy vs exact EV', () => {
  it('holds two unsuited high cards, not one', () => {
    expectOptimal('job-9-6', [c(12, 'spades'), c(11, 'hearts'), c(7, 'diamonds'), c(4, 'clubs'), c(9, 'spades')])
  })

  it('prefers 3 to a straight flush over a 4-card inside straight', () => {
    expectOptimal('job-9-6', [c(5, 'hearts'), c(6, 'hearts'), c(7, 'hearts'), c(9, 'clubs'), c(3, 'spades')])
  })

  it('discards everything rather than holding 3 to a flush', () => {
    expectOptimal('job-9-6', [c(3, 'hearts'), c(7, 'hearts'), c(9, 'hearts'), c(4, 'spades'), c(8, 'clubs')])
  })

  it('holds unsuited TJQK over a low pair of tens', () => {
    expectOptimal('job-9-6', [c(10, 'spades'), c(10, 'hearts'), c(11, 'diamonds'), c(12, 'clubs'), c(13, 'spades')])
  })

  it('holds the low pair over a 4-card outside straight', () => {
    expectOptimal('job-9-6', [c(5, 'spades'), c(5, 'hearts'), c(6, 'diamonds'), c(7, 'clubs'), c(8, 'spades')])
  })

  it('holds a lone jack from an unsuited single-high-card hand', () => {
    expectOptimal('job-9-6', [c(11, 'hearts'), c(7, 'diamonds'), c(4, 'clubs'), c(9, 'spades'), c(3, 'spades')])
  })

  it('holds pat hands (flush)', () => {
    expectOptimal('job-9-6', [c(3, 'hearts'), c(7, 'hearts'), c(9, 'hearts'), c(11, 'hearts'), c(13, 'hearts')])
  })

  it('breaks a flush for 4 to a royal', () => {
    expectOptimal('job-9-6', [c(10, 'hearts'), c(11, 'hearts'), c(12, 'hearts'), c(13, 'hearts'), c(4, 'hearts')])
  })
})

describe('Double Double Bonus strategy vs exact EV', () => {
  it('holds only the aces from aces-up two pair', () => {
    expectOptimal('ddb-9-6', [c(14, 'spades'), c(14, 'hearts'), c(3, 'clubs'), c(3, 'diamonds'), c(8, 'spades')])
  })

  it('holds three aces alone — never a kicker (12.49 vs 11.83 exact)', () => {
    expectOptimal('ddb-9-6', [c(14, 'spades'), c(14, 'hearts'), c(14, 'clubs'), c(3, 'diamonds'), c(8, 'spades')])
  })

  it('breaks a full house containing three aces', () => {
    expectOptimal('ddb-9-6', [c(14, 'spades'), c(14, 'hearts'), c(14, 'clubs'), c(3, 'diamonds'), c(3, 'spades')])
  })

  it('holds a lone ace over ace + unsuited high card', () => {
    expectOptimal('ddb-9-6', [c(14, 'spades'), c(11, 'hearts'), c(7, 'diamonds'), c(4, 'clubs'), c(9, 'spades')])
  })

  it('still holds unsuited JQ when an ace is also present', () => {
    expectOptimal('ddb-9-6', [c(14, 'spades'), c(11, 'hearts'), c(12, 'diamonds'), c(4, 'clubs'), c(9, 'spades')])
  })

  it('discards a 5-K kicker next to quad aces to draw for the 2-4 kicker', () => {
    expectOptimal('ddb-9-6', [c(14, 'spades'), c(14, 'hearts'), c(14, 'clubs'), c(14, 'diamonds'), c(8, 'spades')])
  })

  it('holds non-ace two pair', () => {
    expectOptimal('ddb-9-6', [c(9, 'spades'), c(9, 'hearts'), c(3, 'clubs'), c(3, 'diamonds'), c(8, 'spades')])
  })
})

describe('Bonus / Double Bonus / Deluxe strategy vs exact EV', () => {
  it('Double Bonus breaks a full house containing trip aces', () => {
    expectOptimal('double-bonus-10-7', [c(14, 'spades'), c(14, 'hearts'), c(14, 'clubs'), c(3, 'diamonds'), c(3, 'spades')])
  })

  it('Bonus Poker keeps a full house containing trip aces', () => {
    expectOptimal('bonus-8-5', [c(14, 'spades'), c(14, 'hearts'), c(14, 'clubs'), c(3, 'diamonds'), c(3, 'spades')])
  })

  it('Bonus Deluxe holds both pairs of two pair despite the 1:1 payout', () => {
    expectOptimal('bonus-deluxe-8-6', [c(14, 'spades'), c(14, 'hearts'), c(3, 'clubs'), c(3, 'diamonds'), c(8, 'spades')])
  })

  it('Double Bonus holds a 4-card inside straight over a full redraw', () => {
    expectOptimal('double-bonus-10-7', [c(4, 'spades'), c(5, 'hearts'), c(6, 'diamonds'), c(8, 'clubs'), c(9, 'hearts')])
  })

  it('Double Bonus holds 4 to a flush over a pair of queens', () => {
    expectOptimal('double-bonus-10-7', [c(13, 'clubs'), c(12, 'diamonds'), c(12, 'clubs'), c(14, 'clubs'), c(9, 'clubs')])
  })

  it('Double Bonus holds a pair of aces over 4 to a flush', () => {
    expectOptimal('double-bonus-10-7', [c(14, 'clubs'), c(14, 'diamonds'), c(7, 'clubs'), c(9, 'clubs'), c(13, 'clubs')])
  })

  it('Double Bonus holds 3 to a royal over a pair of jacks', () => {
    expectOptimal('double-bonus-10-7', [c(11, 'spades'), c(11, 'hearts'), c(12, 'hearts'), c(13, 'hearts'), c(4, 'diamonds')])
  })

  it('Double Bonus holds a 4-card outside straight over a low pair', () => {
    expectOptimal('double-bonus-10-7', [c(6, 'spades'), c(6, 'hearts'), c(7, 'diamonds'), c(8, 'clubs'), c(9, 'hearts')])
  })

  it('Double Bonus holds an ace-low inside straight over ace + high card', () => {
    expectOptimal('double-bonus-10-7', [c(3, 'diamonds'), c(4, 'clubs'), c(11, 'diamonds'), c(14, 'spades'), c(2, 'diamonds')])
  })

  it('Double Bonus holds a 3-high inside straight over suited KQ', () => {
    expectOptimal('double-bonus-10-7', [c(8, 'spades'), c(11, 'clubs'), c(9, 'diamonds'), c(12, 'hearts'), c(13, 'hearts')])
  })

  it('Double Bonus keeps suited QJ over a 2-high inside straight', () => {
    expectOptimal('double-bonus-10-7', [c(12, 'hearts'), c(11, 'hearts'), c(9, 'diamonds'), c(8, 'spades'), c(4, 'clubs')])
  })

  it('Double Bonus holds 3 to a flush over a full redraw', () => {
    expectOptimal('double-bonus-10-7', [c(5, 'spades'), c(8, 'clubs'), c(9, 'clubs'), c(2, 'clubs'), c(10, 'hearts')])
  })
})

// Deterministic PRNG (shared app helper) so sampled hands are stable across runs
function seededShuffle(deck: Card[], rng: () => number): Card[] {
  return shuffle(deck, n => prngInt(rng, n))
}

describe('random-hand smoke test vs exact EV', () => {
  const VARIANTS = ['job-9-6', 'deuces-wild-full', 'ddb-9-6', 'bonus-8-5', 'double-bonus-10-7', 'bonus-deluxe-8-6']
  const HANDS_PER_VARIANT = 3

  it('never gives up a large chunk of EV on sampled hands', () => {
    const rng = makeRng(0xC0FFEE)
    for (const id of VARIANTS) {
      const pt = PAY_TABLES[id]!
      for (let h = 0; h < HANDS_PER_VARIANT; h++) {
        const deck = seededShuffle(createDeck(), rng)
        const hand = deck.slice(0, 5)
        const remaining = deck.slice(5)
        const options = analyzeHand(hand, pt, remaining, 5)
        const held = fastOptimalHold(hand, pt)
        const chosen = options.find(o =>
          o.heldIndices.length === held.length && o.heldIndices.every(i => held.includes(i))
        )!
        const loss = options[0]!.expectedValue - chosen.expectedValue
        expect(
          loss,
          `${id} hand [${hand.map(cardLabel).join(' ')}]: held [${held.map(i => cardLabel(hand[i]!)).join(' ')}] `
          + `loses ${loss.toFixed(4)} EV/coin vs optimal [${options[0]!.heldIndices.map(i => cardLabel(hand[i]!)).join(' ')}]`
        ).toBeLessThan(0.1)
      }
    }
  }, 120_000)
})

describe('simulated return tripwire', () => {
  // Deterministic regression net for the strategy tables: a fixed seed deals
  // the same 60k hands every run, so this never flakes on royal-frequency
  // luck (which is ±1.6pp at this sample size with a live RNG). It exists to
  // catch the class of bug that once played Deuces Wild at 94% instead of
  // 100.76% — precision is certified by the exact-EV suites above.
  function playHands(pt: PayTableDef, numHands: number, rng: () => number): number {
    let returned = 0
    for (let i = 0; i < numHands; i++) {
      const deck = seededShuffle(createDeck(), rng)
      const dealt = deck.slice(0, 5)
      const remaining = deck.slice(5)
      const heldSet = new Set(fastOptimalHold(dealt, pt))
      const finalHand = [...dealt]
      let drawIdx = 0
      for (let j = 0; j < 5; j++) {
        if (!heldSet.has(j)) {
          finalHand[j] = remaining[drawIdx]!
          drawIdx++
        }
      }
      const handName = classifyForPayTable(finalHand, pt)
      if (handName !== 'Nothing') returned += getPayForHand(pt, handName, 5)
    }
    return (returned / (numHands * 5)) * 100
  }

  it('long-run returns stay near theoretical for every variant', () => {
    const N = 60_000
    for (const id of ['job-9-6', 'deuces-wild-full', 'ddb-9-6', 'bonus-8-5', 'double-bonus-10-7', 'bonus-deluxe-8-6']) {
      const pt = PAY_TABLES[id]!
      const actual = playHands(pt, N, makeRng(0x5EED))
      expect(
        Math.abs(actual - pt.returnPct),
        `${id}: simulated ${actual.toFixed(2)}% vs theoretical ${pt.returnPct}%`
      ).toBeLessThan(2.5)
    }
  }, 300_000)
})
