import { describe, it, expect } from 'vitest'
import type { Card } from '../app/utils/cards'
import { cardLabel } from '../app/utils/cards'
import { classifyHand, classifyBonusHand, classifyDDBHand } from '../app/utils/handClassifier'
import { classifyDeucesWild } from '../app/utils/wildClassifier'
import { handShape, rankCounts } from '../app/utils/handShape'
import { DECK } from './helpers/exactEv'

/**
 * The classifiers are the hottest code in the app: the EV analyzer calls them
 * 2.6 million times per dealt hand. This suite pins two things:
 *
 * 1. Output identity with the handShape-based reference implementations
 *    below (the classifiers as of 2026-09-05, which an independent
 *    brute-force evaluator confirmed on every one of the 2,598,960 hands).
 * 2. A speed floor: the four classifiers must cover the whole deck in well
 *    under the ~8 s the allocating reference needs, or the analyzer slides
 *    back to multi-second per-hand analysis and the draw-before-analysis
 *    races come back.
 */

// ── Reference implementations (allocate per call; kept verbatim) ──

function refClassifyHand(cards: Card[]): string {
  if (cards.length !== 5) return 'Nothing'
  const { rankCounts: rc, counts, isFlush, isStraight, isRoyal } = handShape(cards)
  if (isRoyal) return 'Royal Flush'
  if (isFlush && isStraight) return 'Straight Flush'
  if (counts[0] === 4) return 'Four of a Kind'
  if (counts[0] === 3 && counts[1] === 2) return 'Full House'
  if (isFlush) return 'Flush'
  if (isStraight) return 'Straight'
  if (counts[0] === 3) return 'Three of a Kind'
  if (counts[0] === 2 && counts[1] === 2) return 'Two Pair'
  if (counts[0] === 2) {
    const pairRank = [...rc.entries()].find(([, n]) => n === 2)![0]
    if (pairRank >= 11) return 'Jacks or Better'
  }
  return 'Nothing'
}

function refClassifyBonusHand(cards: Card[]): string {
  const base = refClassifyHand(cards)
  if (base === 'Four of a Kind') {
    const rc = rankCounts(cards)
    const quadRank = [...rc.entries()].find(([, n]) => n === 4)![0]
    if (quadRank === 14) return 'Four Aces'
    if (quadRank >= 2 && quadRank <= 4) return 'Four 2s-4s'
    return 'Four 5s-Ks'
  }
  return base
}

function refClassifyDDBHand(cards: Card[]): string {
  const base = refClassifyHand(cards)
  if (base === 'Four of a Kind') {
    const rc = rankCounts(cards)
    const quadRank = [...rc.entries()].find(([, n]) => n === 4)![0]
    const kickerRank = [...rc.entries()].find(([, n]) => n === 1)![0]
    if (quadRank === 14) return (kickerRank >= 2 && kickerRank <= 4) ? 'Four Aces + 2-4' : 'Four Aces + 5-K'
    if (quadRank >= 2 && quadRank <= 4) {
      return (kickerRank === 14 || (kickerRank >= 2 && kickerRank <= 4)) ? 'Four 2s-4s + A-4' : 'Four 2s-4s + 5-K'
    }
    return 'Four 5s-Ks'
  }
  return base
}

function refCanMakeRoyal(uniqueRanks: number[], numWild: number): boolean {
  const royalRanks = [10, 11, 12, 13, 14]
  let needed = 0
  for (const r of royalRanks) if (!uniqueRanks.includes(r)) needed++
  for (const r of uniqueRanks) if (!royalRanks.includes(r)) return false
  return needed <= numWild
}

function refCanMakeStraight(uniqueRanks: number[], numWild: number): boolean {
  const windows = [[3, 4, 5, 6, 7], [4, 5, 6, 7, 8], [5, 6, 7, 8, 9], [6, 7, 8, 9, 10], [7, 8, 9, 10, 11], [8, 9, 10, 11, 12], [9, 10, 11, 12, 13], [10, 11, 12, 13, 14]]
  for (const window of windows) {
    if (uniqueRanks.some(r => !window.includes(r))) continue
    let gaps = 0
    for (const r of window) if (!uniqueRanks.includes(r)) gaps++
    if (gaps <= numWild) return true
  }
  const wheelNaturals = [14, 3, 4, 5]
  if (uniqueRanks.every(r => wheelNaturals.includes(r))) {
    let gaps = 0
    for (const r of wheelNaturals) if (!uniqueRanks.includes(r)) gaps++
    if (gaps + 1 <= numWild) return true
  }
  return false
}

function refCanMakeFullHouse(counts: number[], numWild: number): boolean {
  if (counts.length < 2) return false
  let wildsLeft = numWild
  const needA = Math.max(0, 3 - counts[0]!)
  if (needA > wildsLeft) return false
  wildsLeft -= needA
  return Math.max(0, 2 - counts[1]!) <= wildsLeft
}

function refClassifyDeucesWild(cards: Card[]): string {
  if (cards.length !== 5) return 'Nothing'
  const wilds: Card[] = []
  const naturals: Card[] = []
  for (const c of cards) (c.rank === 2 ? wilds : naturals).push(c)
  const numWild = wilds.length
  if (numWild === 4) return 'Four Deuces'
  if (numWild === 0) {
    const { counts, isFlush, isStraight, isRoyal } = handShape(naturals)
    if (isRoyal) return 'Natural Royal Flush'
    if (isFlush && isStraight) return 'Straight Flush'
    if (counts[0] === 4) return 'Four of a Kind'
    if (counts[0] === 3 && counts[1] === 2) return 'Full House'
    if (isFlush) return 'Flush'
    if (isStraight) return 'Straight'
    if (counts[0] === 3) return 'Three of a Kind'
    return 'Nothing'
  }
  const { uniqueRanks, counts, isFlush: isAllSameSuit } = handShape(naturals)
  if (isAllSameSuit && refCanMakeRoyal(uniqueRanks, numWild)) return 'Wild Royal Flush'
  if (counts[0]! + numWild >= 5) return 'Five of a Kind'
  if (isAllSameSuit && refCanMakeStraight(uniqueRanks, numWild)) return 'Straight Flush'
  if (counts[0]! + numWild >= 4) return 'Four of a Kind'
  if (refCanMakeFullHouse(counts, numWild)) return 'Full House'
  if (isAllSameSuit) return 'Flush'
  if (refCanMakeStraight(uniqueRanks, numWild)) return 'Straight'
  if (counts[0]! + numWild >= 3) return 'Three of a Kind'
  return 'Nothing'
}

const KINDS: { name: string, fast: (c: Card[]) => string, ref: (c: Card[]) => string }[] = [
  { name: 'standard', fast: classifyHand, ref: refClassifyHand },
  { name: 'bonus', fast: classifyBonusHand, ref: refClassifyBonusHand },
  { name: 'ddb', fast: classifyDDBHand, ref: refClassifyDDBHand },
  { name: 'deucesWild', fast: classifyDeucesWild, ref: refClassifyDeucesWild }
]

function forEveryHand(visit: (hand: Card[]) => void) {
  const hand: Card[] = new Array(5)
  for (let a = 0; a < 48; a++) {
    hand[0] = DECK[a]!
    for (let b = a + 1; b < 49; b++) {
      hand[1] = DECK[b]!
      for (let c = b + 1; c < 50; c++) {
        hand[2] = DECK[c]!
        for (let d = c + 1; d < 51; d++) {
          hand[3] = DECK[d]!
          for (let e = d + 1; e < 52; e++) {
            hand[4] = DECK[e]!
            visit(hand)
          }
        }
      }
    }
  }
}

describe('classifier hot path', () => {
  it('classifies every 5-card hand identically to the reference implementations', () => {
    for (const kind of KINDS) {
      let mismatches = 0
      let first = ''
      forEveryHand((hand) => {
        const got = kind.fast(hand)
        const want = kind.ref(hand)
        if (got !== want) {
          mismatches++
          if (!first) first = `${hand.map(cardLabel).join(' ')}: got ${got}, reference ${want}`
        }
      })
      expect(mismatches, `${kind.name}: first mismatch ${first}`).toBe(0)
    }
  }, 300_000)

  it('covers the whole deck four ways in under 3 seconds', () => {
    // The allocating reference path needs ~8 s here on an M-series laptop;
    // the allocation-free classifiers need well under 1 s.
    const start = performance.now()
    let sink = 0
    for (const kind of KINDS) {
      forEveryHand((hand) => {
        sink += kind.fast(hand).length
      })
    }
    const elapsed = performance.now() - start
    expect(sink).toBeGreaterThan(0)
    expect(elapsed, `four full-deck passes took ${(elapsed / 1000).toFixed(2)} s`).toBeLessThan(3000)
  }, 120_000)
})
