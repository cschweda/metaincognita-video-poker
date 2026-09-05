import type { Card } from './cards'
import type { PayTableDef } from './payTables'
import { getPayForHand } from './payTables'
import { classifyDeucesWild } from './wildClassifier'
import { handShape, rankCounts, sortedCounts } from './handShape'
import { combinations } from './combinations'

/**
 * Fast strategy lookup for video poker simulation and bot play.
 *
 * Each variant has a ranked hand-pattern table checked top-down; the first
 * match wins. Entry order follows the published Wizard of Odds strategy
 * lists, and every rule class is graded against this repo's exact
 * brute-force EV calculator in tests/strategyLookup.test.ts — where the
 * published lore and the exact numbers disagreed (e.g. DDB kicker holds),
 * the exact numbers won.
 *
 * 2026-09-05: every rule was re-graded exhaustively — all 2,598,960 deals of
 * every pay table against exact EV (inclusion–exclusion sum tables, see
 * tests/helpers/exactEv.ts). Where the published order and the exact numbers
 * disagreed (Deuces Wild ace-low draws, Double Bonus 3-flushes, the
 * two-pair-pays-1 games' inside straights, DDB kickers…) the exact numbers won.
 * Residual loss per pay table is now 0.001–0.006 percentage points of return,
 * all of it penalty-card residue the ranked-list format cannot express.
 */

type Suit = Card['suit']

// ─── Shared helpers ─────────────────────────────────────────

function indicesOf(cards: Card[], predicate: (c: Card) => boolean): number[] {
  return cards.map((c, i) => predicate(c) ? i : -1).filter(i => i >= 0)
}

export function indicesOfSubset(hand: Card[], subset: Card[]): number[] {
  const used = new Set<number>()
  const result: number[] = []
  for (const target of subset) {
    for (let i = 0; i < hand.length; i++) {
      if (!used.has(i) && hand[i]!.rank === target.rank && hand[i]!.suit === target.suit) {
        result.push(i)
        used.add(i)
        break
      }
    }
  }
  return result
}

// Rank-count and count-sorting primitives are shared: see handShape.ts
const getRankCounts = rankCounts
const getSortedCounts = sortedCounts

function getSuitGroups(cards: Card[]): Map<Suit, Card[]> {
  const m = new Map<Suit, Card[]>()
  for (const c of cards) {
    const arr = m.get(c.suit) || []
    arr.push(c)
    m.set(c.suit, arr)
  }
  return m
}

// k-element subsets (≤5-element arrays here) — shared enumerator, same order
const choose = combinations

const ALL_FIVE = [0, 1, 2, 3, 4]

// ─── Pattern finders ────────────────────────────────────────

/** n suited cards from the royal ranks (10-A) in one suit */
export function findRoyal(cards: Card[], n: number): Card[] | null {
  for (const [, suited] of getSuitGroups(cards)) {
    const royal = suited.filter(c => c.rank >= 10)
    if (royal.length >= n) return royal.slice(0, n)
  }
  return null
}

/** N cards of the same suit */
export function findFlushDraw(cards: Card[], n: number): Card[] | null {
  for (const [, suited] of getSuitGroups(cards)) {
    if (suited.length >= n) return suited.slice(0, n)
  }
  return null
}

/** Do these distinct suited ranks fit inside one straight-flush window? */
function fitsSFWindow(ranks: number[]): boolean {
  const max = Math.max(...ranks)
  const min = Math.min(...ranks)
  if (max - min <= 4) return true
  // Ace-low window A-2-3-4-5
  return ranks.includes(14) && ranks.every(r => r === 14 || r <= 5)
}

/** 4 suited cards that fit one straight-flush window (incl. ace-low) */
export function find4ToSF(cards: Card[]): Card[] | null {
  for (const [, suited] of getSuitGroups(cards)) {
    if (suited.length < 4) continue
    for (const subset of choose(suited, 4)) {
      if (fitsSFWindow(subset.map(c => c.rank))) return subset
    }
  }
  return null
}

/** 4 distinct consecutive ranks that can fill a straight on either end (2..K high) */
export function find4ToOutsideStraight(cards: Card[]): Card[] | null {
  const byRank = new Map<number, Card>()
  for (const c of cards) if (!byRank.has(c.rank)) byRank.set(c.rank, c)
  // Prefer the highest run — more high-card value
  for (let low = 10; low >= 2; low--) {
    const run = [low, low + 1, low + 2, low + 3]
    if (run[3]! > 13) continue
    if (run.every(r => byRank.has(r))) return run.map(r => byRank.get(r)!)
  }
  return null
}

const STRAIGHT_WINDOWS: number[][] = [
  [14, 2, 3, 4, 5],
  [2, 3, 4, 5, 6], [3, 4, 5, 6, 7], [4, 5, 6, 7, 8], [5, 6, 7, 8, 9],
  [6, 7, 8, 9, 10], [7, 8, 9, 10, 11], [8, 9, 10, 11, 12],
  [9, 10, 11, 12, 13], [10, 11, 12, 13, 14]
]

/**
 * 4 distinct ranks filling 4 slots of a 5-card straight window, excluding
 * open-ended runs (those are find4ToOutsideStraight). Returns the candidate
 * with the most high cards (J, Q, K, A).
 */
export function find4ToInsideStraight(cards: Card[]): { picks: Card[], highs: number } | null {
  const byRank = new Map<number, Card>()
  for (const c of cards) if (!byRank.has(c.rank)) byRank.set(c.rank, c)

  let best: { picks: Card[], highs: number } | null = null
  for (const window of STRAIGHT_WINDOWS) {
    const present = window.filter(r => byRank.has(r))
    if (present.length !== 4) continue
    // Skip open-ended runs — handled (and ranked) separately
    const sorted = [...present].sort((a, b) => a - b)
    const consecutive = sorted[3]! - sorted[0]! === 3
    if (consecutive && sorted[0]! >= 2 && sorted[3]! <= 13) continue
    const picks = present.map(r => byRank.get(r)!)
    const highs = present.filter(r => r >= 11).length
    if (!best || highs > best.highs) best = { picks, highs }
  }
  return best
}

/**
 * 3 suited cards fitting a straight-flush window, typed per Wizard of Odds:
 * type 1 — high cards >= gaps; type 3 — two gaps, no high cards;
 * type 2 — everything else (including ace-low).
 */
export function find3ToSF(cards: Card[]): { picks: Card[], sfType: 1 | 2 | 3, gaps: number } | null {
  let best: { picks: Card[], sfType: 1 | 2 | 3, gaps: number } | null = null
  for (const [, suited] of getSuitGroups(cards)) {
    if (suited.length < 3) continue
    for (const subset of choose(suited, 3)) {
      const ranks = subset.map(c => c.rank).sort((a, b) => a - b)
      let sfType: 1 | 2 | 3
      let gaps: number
      if (ranks.includes(14)) {
        // Ace-high suited combos within a window are royal draws (handled
        // earlier); only the ace-low window remains, which is type 2.
        if (!ranks.every(r => r === 14 || r <= 5)) continue
        sfType = 2
        gaps = ([2, 3, 4, 5] as Card['rank'][]).filter(r => !ranks.includes(r)).length - 1
      } else {
        const span = ranks[2]! - ranks[0]!
        if (span > 4) continue
        gaps = span - 2
        const highs = ranks.filter(r => r >= 11).length
        // 2-3-4 fits only two straight-flush windows (A-5 and 2-6), so exact
        // EV ranks it with the type-2 draws, below every suited high pair.
        const is234 = ranks[0] === 2 && ranks[1] === 3 && ranks[2] === 4
        sfType = highs >= gaps && !is234 ? 1 : (gaps === 2 && highs === 0 ? 3 : 2)
      }
      if (!best || sfType < best.sfType) best = { picks: subset, sfType, gaps }
    }
  }
  return best
}

/** First same-suit pair of the given ranks, tried in order */
export function findSuitedRanks(cards: Card[], rankPairs: [number, number][]): Card[] | null {
  const sg = getSuitGroups(cards)
  for (const [a, b] of rankPairs) {
    for (const [, suited] of sg) {
      const ca = suited.find(c => c.rank === a)
      const cb = suited.find(c => c.rank === b)
      if (ca && cb) return [ca, cb]
    }
  }
  return null
}

/** One card per wanted rank (any suits), or null if a rank is missing */
export function pickByRanks(cards: Card[], wanted: number[]): Card[] | null {
  const picks: Card[] = []
  for (const r of wanted) {
    const card = cards.find(c => c.rank === r && !picks.includes(c))
    if (!card) return null
    picks.push(card)
  }
  return picks
}

// ─── Jacks or Better (full ~33-entry table, Wizard of Odds order) ───

interface JobOpts {
  /** DDB: with an ace + one other unsuited high card, hold the ace alone */
  aceAloneOverUnsuitedPair?: boolean
  /** Two-pair-pays-1 games: hold a 4-card inside straight over a full redraw */
  holdInsideStraightOverRedraw?: boolean
  /** DB (5-coin straight): an inside straight with a high card beats the unsuited high-card holds */
  insideWithHighOverHighCards?: boolean
  /** DB: an inside straight with 3+ high cards beats suited Q-J */
  insideThreeHighOverSuitedQJ?: boolean
  /** DB: a type-1 straight-flush draw with a high card beats a low pair */
  sfType1HighOverLowPair?: boolean
  /** DB: suited T-Q beats unsuited K-Q / K-J */
  suitedTQOverUnsuitedKx?: boolean
  /** Double Bonus (flush pays 7): 3-to-royal and 4-to-flush outrank a non-ace high pair */
  flushDrawOverHighPair?: boolean
  /** Outside straight outranks a low pair when it has at least this many high cards (DB 0, DDB 1) */
  straightDrawOverLowPairMinHighs?: number
  /** Two-pair-pays-1 games: A-K-Q-J (4-high inside straight) beats suited Q-J */
  fourHighInsideOverSuitedQJ?: boolean
  /** Two-pair-pays-1 games: inside straight with 2 high cards beats two unsuited high cards / suited T-x */
  insideTwoHighOverTwoHigh?: boolean
  /** Two-pair-pays-1 games: a 4-flush containing an A-x-T royal beats the bare 3-royal */
  flushOverAceTenRoyal?: boolean
  /** DDB: a lone ace beats suited T-x royals and unsuited K-x */
  aceOverKingCombos?: boolean
  /** DB (7-coin flush): a 3-flush with a high card beats lone/unsuited high cards and extends suited K-x / A-x holds */
  threeFlushWithHigh?: boolean
  /** DB: unsuited Q-J-T beats unsuited Q-J */
  qjtOverQJ?: boolean
  /** DB: a type-3 straight-flush draw beats a lone high card */
  type3SFOverHighCard?: boolean
}

/** Add the third same-suit card to a suited 2-card hold when one exists */
function extendToFlush3(cards: Card[], pair: Card[]): Card[] {
  const third = cards.find(c => c.suit === pair[0]!.suit && !pair.includes(c))
  return third ? [...pair, third] : pair
}

function jobStrategy(cards: Card[], opts: JobOpts = {}): number[] {
  const { rankCounts: rc, counts, isFlush: fl, isStraight: st, isRoyal } = handShape(cards)

  // 1-3. Pat royal / straight flush / four of a kind
  if (isRoyal) return ALL_FIVE
  if (fl && st) return ALL_FIVE
  if (counts[0] === 4) return ALL_FIVE

  // 4. Four to a royal (breaks pat flushes/straights/high pairs)
  const r4 = findRoyal(cards, 4)
  if (r4) return indicesOfSubset(cards, r4)

  // 5-8. Full house / flush / three of a kind / straight
  if (counts[0] === 3 && counts[1] === 2) return ALL_FIVE
  if (fl) return ALL_FIVE
  if (counts[0] === 3) {
    const tripRank = [...rc.entries()].find(([, c]) => c === 3)![0]
    return indicesOf(cards, c => c.rank === tripRank)
  }
  if (st) return ALL_FIVE

  // 9. Four to a straight flush
  const sf4 = find4ToSF(cards)
  if (sf4) return indicesOfSubset(cards, sf4)

  // 10. Two pair
  if (counts[0] === 2 && counts[1] === 2) {
    const pairRanks = [...rc.entries()].filter(([, c]) => c === 2).map(([r]) => r)
    return indicesOf(cards, c => pairRanks.includes(c.rank))
  }

  // 11. High pair (J-A). In Double Bonus a non-ace high pair yields to
  // 3-to-royal (1.54 vs 1.46) and 4-to-flush (1.51 vs 1.46); aces never do.
  const pairRank = counts[0] === 2 ? [...rc.entries()].find(([, c]) => c === 2)![0] : null
  if (pairRank !== null && pairRank >= 11) {
    if (opts.flushDrawOverHighPair && pairRank !== 14) {
      // Exhaustive exact EV (10/7 DB): only the 3-royals with the most
      // straight windows beat a J-K pair — Q-J-T (even over the 4-flush
      // containing it) and K-Q-J; a 4-flush beats the pair only with 3 high cards.
      const royal3 = findRoyal(cards, 3)
      const royalKey = royal3 ? royal3.map(c => c.rank).sort((a, b) => a - b).join(',') : ''
      if (royalKey === '10,11,12') return indicesOfSubset(cards, royal3!)
      const flush4 = findFlushDraw(cards, 4)
      if (flush4 && flush4.filter(c => c.rank >= 11).length >= 3) return indicesOfSubset(cards, flush4)
      if (royalKey === '11,12,13') return indicesOfSubset(cards, royal3!)
    }
    return indicesOf(cards, c => c.rank === pairRank)
  }

  // 12-13. Three to a royal, then four to a flush. Double Bonus flips them:
  // at a 7-coin flush the 4-flush beats the 3-royal it contains.
  const r3 = findRoyal(cards, 3)
  if (opts.flushDrawOverHighPair) {
    // Q-J-T is the one 3-royal that beats the 7-coin 4-flush containing it
    if (r3 && r3.map(c => c.rank).sort((a, b) => a - b).join(',') === '10,11,12') return indicesOfSubset(cards, r3)
    const dbFlush4 = findFlushDraw(cards, 4)
    if (dbFlush4) return indicesOfSubset(cards, dbFlush4)
  }
  if (r3) {
    // A-x-T royals have a single straight window: with two-pair paying 1 the
    // 4-flush containing them is worth more than the bare 3-royal
    if (opts.flushOverAceTenRoyal) {
      const rr = r3.map(c => c.rank)
      if (rr.includes(14) && rr.includes(10)) {
        const f4 = findFlushDraw(cards, 4)
        if (f4) return indicesOfSubset(cards, f4)
      }
    }
    return indicesOfSubset(cards, r3)
  }

  const f4 = findFlushDraw(cards, 4)
  if (f4) return indicesOfSubset(cards, f4)

  // 14. Unsuited T-J-Q-K (the one straight draw that beats a low pair)
  const tjqk = pickByRanks(cards, [10, 11, 12, 13])
  if (tjqk) return indicesOfSubset(cards, tjqk)

  // 15. Low pair (Double Bonus prefers the 4-card outside straight: 0.85 vs 0.74)
  if (pairRank !== null) {
    if (opts.straightDrawOverLowPairMinHighs !== undefined) {
      const run4 = find4ToOutsideStraight(cards)
      if (run4 && run4.filter(c => c.rank >= 11).length >= opts.straightDrawOverLowPairMinHighs) {
        return indicesOfSubset(cards, run4)
      }
    }
    if (opts.sfType1HighOverLowPair) {
      // Only the strongest type-1 draws (more high cards than gaps: 9-T-J,
      // 9-J-Q...) beat the pair; 8-9-J or 8-J-Q do not
      const sfEarly = find3ToSF(cards)
      if (sfEarly && sfEarly.sfType === 1
        && sfEarly.picks.filter(c => c.rank >= 11).length - sfEarly.gaps >= 1) {
        return indicesOfSubset(cards, sfEarly.picks)
      }
    }
    return indicesOf(cards, c => c.rank === pairRank)
  }

  // 16. Four to an outside straight
  const st4 = find4ToOutsideStraight(cards)
  if (st4) return indicesOfSubset(cards, st4)

  // 17. Three to a straight flush, type 1 (high cards >= gaps)
  const sf3 = find3ToSF(cards)
  if (sf3 && sf3.sfType === 1) return indicesOfSubset(cards, sf3.picks)

  // 17b. Double Bonus only: an inside straight with 3 high cards beats the
  // suited high-card combos below it (0.617 vs suited QJ at 0.581)
  const inside = find4ToInsideStraight(cards)
  if (opts.insideThreeHighOverSuitedQJ && inside && inside.highs >= 3) {
    return indicesOfSubset(cards, inside.picks)
  }
  if (opts.fourHighInsideOverSuitedQJ && inside && inside.highs === 4) return indicesOfSubset(cards, inside.picks)

  // 18. Suited Q-J
  const qj = findSuitedRanks(cards, [[12, 11]])
  if (qj) return indicesOfSubset(cards, qj)

  // 19. Four to an inside straight, 4 high cards (J-Q-K-A)
  if (inside && inside.highs === 4) return indicesOfSubset(cards, inside.picks)

  // 20. Suited K-Q or K-J (Double Bonus: keep a third suited card too)
  const kx = findSuitedRanks(cards, [[13, 12], [13, 11]])
  if (kx) return indicesOfSubset(cards, opts.threeFlushWithHigh ? extendToFlush3(cards, kx) : kx)

  // 21. Suited A-K, A-Q or A-J (Double Bonus: keep a third suited card too)
  const ax = findSuitedRanks(cards, [[14, 13], [14, 12], [14, 11]])
  if (ax) return indicesOfSubset(cards, opts.threeFlushWithHigh ? extendToFlush3(cards, ax) : ax)

  // 22. Four to an inside straight, 3 high cards
  if (inside && inside.highs === 3) return indicesOfSubset(cards, inside.picks)

  // 23. Three to a straight flush, type 2
  if (sf3 && sf3.sfType === 2) return indicesOfSubset(cards, sf3.picks)

  // 23a. Two-pair-pays-1 games: inside straight with 2 high cards beats two high cards
  if (opts.insideTwoHighOverTwoHigh && inside && inside.highs >= 2) return indicesOfSubset(cards, inside.picks)

  // 23b. Double Bonus only: at a 5-coin straight, an inside straight holding
  // at least one high card beats every unsuited high-card combination below
  // (e.g. A-2-3-4 at 0.49 vs ace + jack at 0.45)
  if (opts.insideWithHighOverHighCards && inside && inside.highs >= 1) {
    return indicesOfSubset(cards, inside.picks)
  }

  // 24. Unsuited J-Q-K
  const jqk = pickByRanks(cards, [11, 12, 13])
  if (jqk) return indicesOfSubset(cards, jqk)

  // 24b. Double Bonus (5-coin straight): unsuited Q-J-T beats unsuited Q-J
  if (opts.qjtOverQJ) {
    const qjt = pickByRanks(cards, [10, 11, 12])
    if (qjt) return indicesOfSubset(cards, qjt)
  }

  // 25. Unsuited J-Q
  const jq = pickByRanks(cards, [11, 12])
  if (jq) return indicesOfSubset(cards, jq)

  // 25b. DDB: a lone ace beats suited T-x and unsuited K-x from here down
  if (opts.aceOverKingCombos && rc.has(14)) return indicesOf(cards, c => c.rank === 14).slice(0, 1)

  // 26. Suited T-J
  const tj = findSuitedRanks(cards, [[11, 10]])
  if (tj) return indicesOfSubset(cards, tj)

  // 26b. Double Bonus (7-coin flush): a 3-flush with a high card beats every
  // lone / unsuited high-card hold below it
  if (opts.threeFlushWithHigh) {
    const f3 = findFlushDraw(cards, 3)
    if (f3 && f3.some(c => c.rank >= 11)) return indicesOfSubset(cards, f3)
  }

  // 28 (DB order). Suited T-Q beats unsuited K-x at a 7-coin flush
  const tq = findSuitedRanks(cards, [[12, 10]])
  if (opts.suitedTQOverUnsuitedKx && tq) return indicesOfSubset(cards, tq)

  // 27. Unsuited K-Q or K-J
  const kq = pickByRanks(cards, [13, 12]) ?? pickByRanks(cards, [13, 11])
  if (kq) return indicesOfSubset(cards, kq)

  // 28. Suited T-Q
  if (tq) return indicesOfSubset(cards, tq)

  // 29. Unsuited ace + J/Q/K (DDB holds the ace alone instead)
  const hasAce = rc.has(14)
  if (hasAce) {
    const other = cards.find(c => c.rank >= 11 && c.rank <= 13)
    if (other) {
      if (opts.aceAloneOverUnsuitedPair) return indicesOf(cards, c => c.rank === 14).slice(0, 1)
      const ace = cards.find(c => c.rank === 14)!
      return indicesOfSubset(cards, [ace, other])
    }
  }

  // 30. Suited T-K
  const tk = findSuitedRanks(cards, [[13, 10]])
  if (tk) return indicesOfSubset(cards, tk)

  // 30b. Double Bonus: a two-gap straight-flush draw beats a lone high card
  if (opts.type3SFOverHighCard && sf3 && sf3.sfType === 3) return indicesOfSubset(cards, sf3.picks)

  // 31. One high card (prefer J, then Q, K, A — lower ranks keep more straights alive)
  const highCards = cards.filter(c => c.rank >= 11)
  if (highCards.length > 0) {
    const lowest = [...highCards].sort((a, b) => a.rank - b.rank)[0]!
    return indicesOfSubset(cards, [lowest])
  }

  // 32. Three to a straight flush, type 3 (two gaps, no high cards)
  if (sf3) return indicesOfSubset(cards, sf3.picks)

  // 32b. Double Bonus only: a 4-card inside straight beats a full redraw
  if (opts.holdInsideStraightOverRedraw && inside) return indicesOfSubset(cards, inside.picks)

  // 32c. Double Bonus only: at a 7-coin flush, even 3 to a flush beats a redraw
  if (opts.flushDrawOverHighPair) {
    const flush3 = findFlushDraw(cards, 3)
    if (flush3) return indicesOfSubset(cards, flush3)
  }

  // 33. Discard everything
  return []
}

// ─── Bonus Poker / Double Bonus ─────────────────────────────

function bonusStrategy(cards: Card[], payTable: PayTableDef): number[] {
  // 8/5 Bonus Poker plays the JoB table (the quad bonuses don't change any
  // hold decision the table can express). 10/7 Double Bonus differs twice:
  // a straight pays 5, making 4-card inside straights better than a redraw,
  // and quad aces pay 160, making trip aces worth breaking a full house for
  // (10.11 vs 10.00 exact EV).
  const isDoubleBonus = getPayForHand(payTable, 'Four Aces', 1) >= 160
  if (isDoubleBonus) {
    const rc = getRankCounts(cards)
    if (rc.get(14) === 3) return indicesOf(cards, c => c.rank === 14)
  }
  const straightPay = getPayForHand(payTable, 'Straight', 1)
  const flushPay = getPayForHand(payTable, 'Flush', 1)
  return jobStrategy(cards, {
    holdInsideStraightOverRedraw: straightPay >= 5,
    insideWithHighOverHighCards: straightPay >= 5,
    insideThreeHighOverSuitedQJ: straightPay >= 5,
    straightDrawOverLowPairMinHighs: straightPay >= 5 ? 0 : undefined,
    flushDrawOverHighPair: flushPay >= 7,
    aceAloneOverUnsuitedPair: isDoubleBonus,
    threeFlushWithHigh: isDoubleBonus,
    qjtOverQJ: isDoubleBonus,
    type3SFOverHighCard: isDoubleBonus,
    fourHighInsideOverSuitedQJ: isDoubleBonus,
    sfType1HighOverLowPair: isDoubleBonus,
    suitedTQOverUnsuitedKx: isDoubleBonus
  })
}

// ─── Double Double Bonus (kicker-aware) ─────────────────────

function ddbStrategy(cards: Card[]): number[] {
  const rc = getRankCounts(cards)
  const counts = getSortedCounts(rc)

  // Quads: the kicker only stays when it completes a premium category.
  // Quad aces + 2-4 kicker (400) and quad 2s-4s + A-4 kicker (160) are pat;
  // otherwise discard the kicker and draw at the premium version.
  if (counts[0] === 4) {
    const quadRank = [...rc.entries()].find(([, c]) => c === 4)![0]
    const kickerRank = [...rc.entries()].find(([, c]) => c === 1)![0]
    const quadIndices = indicesOf(cards, c => c.rank === quadRank)
    if (quadRank === 14) {
      return kickerRank <= 4 ? ALL_FIVE : quadIndices
    }
    if (quadRank <= 4) {
      return (kickerRank === 14 || kickerRank <= 4) ? ALL_FIVE : quadIndices
    }
    return ALL_FIVE
  }

  // Three aces: hold exactly the aces — break even a full house for them,
  // and never hold a kicker (exact EV: AAA 12.49 vs AAA+kicker 11.83).
  if (rc.get(14) === 3) {
    return indicesOf(cards, c => c.rank === 14)
  }

  // Two pair containing aces: hold only the aces (1.90 vs 1.68 for both pairs)
  if (counts[0] === 2 && counts[1] === 2 && rc.get(14) === 2) {
    return indicesOf(cards, c => c.rank === 14)
  }

  return jobStrategy(cards, {
    aceAloneOverUnsuitedPair: true,
    aceOverKingCombos: true,
    holdInsideStraightOverRedraw: true,
    insideTwoHighOverTwoHigh: true,
    fourHighInsideOverSuitedQJ: true,
    flushOverAceTenRoyal: true,
    straightDrawOverLowPairMinHighs: 1
  })
}

// ─── Deuces Wild (full pay, by deuce count) ─────────────────

/** Pair of consecutive same-suit naturals with low card >= minLow */
function findSuitedConsecutive2(naturals: Card[], minLow: number): Card[] | null {
  for (const [, suited] of getSuitGroups(naturals)) {
    const sorted = [...suited].sort((a, b) => a.rank - b.rank)
    for (let i = 0; i + 1 < sorted.length; i++) {
      const a = sorted[i]!
      const b = sorted[i + 1]!
      // K-A is a royal pair with one straight-flush window, not a connector
      if (b.rank - a.rank === 1 && a.rank >= minLow && b.rank !== 14) return [a, b]
    }
  }
  return null
}

/** Three consecutive same-suit naturals with low card >= minLow */
function findSuitedConsecutive3(naturals: Card[], minLow: number): Card[] | null {
  for (const [, suited] of getSuitGroups(naturals)) {
    const sorted = [...suited].sort((a, b) => a.rank - b.rank)
    for (let i = 0; i + 2 < sorted.length; i++) {
      const [a, b, c] = [sorted[i]!, sorted[i + 1]!, sorted[i + 2]!]
      if (b.rank - a.rank === 1 && c.rank - b.rank === 1 && a.rank >= minLow) return [a, b, c]
    }
  }
  return null
}

/** Three same-suit naturals that fit an SF window together with one wild */
function find3SuitedSFWindow(naturals: Card[]): Card[] | null {
  for (const [, suited] of getSuitGroups(naturals)) {
    if (suited.length < 3) continue
    for (const subset of choose(suited, 3)) {
      const ranks = subset.map(c => c.rank)
      // Naturals are never 2s; the ace-low window means A + cards <= 5
      if (fitsSFWindow(ranks)) return subset
    }
  }
  return null
}

/** Deuces Wild inside-straight finder: the wheel is excluded (its missing 2 can only be a wild) */
function find4ToInsideStraightDW(cards: Card[]): { picks: Card[], highs: number } | null {
  const byRank = new Map<number, Card>()
  for (const c of cards) if (!byRank.has(c.rank)) byRank.set(c.rank, c)
  let best: { picks: Card[], highs: number } | null = null
  for (const window of STRAIGHT_WINDOWS) {
    if (window.includes(2)) continue
    const present = window.filter(r => byRank.has(r))
    if (present.length !== 4) continue
    const sorted = [...present].sort((a, b) => a - b)
    if (sorted[3]! - sorted[0]! === 3 && sorted[0]! >= 4 && sorted[3]! <= 13) continue
    const picks = present.map(r => byRank.get(r)!)
    const highs = present.filter(r => r >= 11).length
    if (!best || highs > best.highs) best = { picks, highs }
  }
  return best
}

function deucesWildStrategy(cards: Card[]): number[] {
  const deuceIndices = indicesOf(cards, c => c.rank === 2)
  const naturals = cards.filter(c => c.rank !== 2)
  const numDeuces = deuceIndices.length
  const made = classifyDeucesWild(cards)

  if (numDeuces === 4) return ALL_FIVE

  if (numDeuces === 3) {
    // Only a made wild royal beats holding the three deuces alone. A pat
    // five of a kind loses by a hair (15.00 vs 15.06 exact EV) — unless the
    // pair is T-A: discarding two royal ranks costs enough wild-royal and
    // straight-flush outs that the pat 15 is worth more.
    if (made === 'Wild Royal Flush') return ALL_FIVE
    if (made === 'Five of a Kind' && naturals[0]!.rank >= 10) return ALL_FIVE
    return deuceIndices
  }

  if (numDeuces === 2) {
    if (made === 'Wild Royal Flush' || made === 'Five of a Kind' || made === 'Straight Flush') return ALL_FIVE

    // Quads (natural pair + 2 wilds): hold them, draw at five of a kind
    const natRC = getRankCounts(naturals)
    const pairEntry = [...natRC.entries()].find(([, c]) => c >= 2)
    if (pairEntry) return [...deuceIndices, ...indicesOf(cards, c => c.rank === pairEntry[0])]

    // 4 to a wild royal
    const r2 = findRoyal(naturals, 2)
    if (r2) return [...deuceIndices, ...indicesOfSubset(cards, r2)]

    // 4 to a straight flush: two suited consecutive naturals, 6-7 or higher
    const sf2 = findSuitedConsecutive2(naturals, 6)
    if (sf2) return [...deuceIndices, ...indicesOfSubset(cards, sf2)]

    // Two deuces alone beat pat flushes and straights (3.05 vs 2.0)
    return deuceIndices
  }

  if (numDeuces === 1) {
    if (made === 'Wild Royal Flush' || made === 'Five of a Kind' || made === 'Straight Flush') return ALL_FIVE

    const natRC = getRankCounts(naturals)
    const natCounts = getSortedCounts(natRC)

    // Quads (natural trips + wild): hold them, draw at five of a kind
    if (natCounts[0] === 3) {
      const tripRank = [...natRC.entries()].find(([, c]) => c === 3)![0]
      return [...deuceIndices, ...indicesOf(cards, c => c.rank === tripRank)]
    }

    // 4 to a wild royal
    const r3 = findRoyal(naturals, 3)
    if (r3) return [...deuceIndices, ...indicesOfSubset(cards, r3)]

    // Pat full house (wild + two pair)
    if (made === 'Full House') return ALL_FIVE

    // 4 to a straight flush, three consecutive suited naturals 5-6-7 or better
    // — beats holding wild + pair (2.23 vs 2.02 exact EV)
    const sfc = findSuitedConsecutive3(naturals, 5)
    if (sfc) return [...deuceIndices, ...indicesOfSubset(cards, sfc)]

    // Three of a kind (wild + natural pair)
    if (natCounts[0] === 2) {
      const pairRank = [...natRC.entries()].find(([, c]) => c === 2)![0]
      return [...deuceIndices, ...indicesOf(cards, c => c.rank === pairRank)]
    }

    // Pat straight / flush
    if (made === 'Straight' || made === 'Flush') return ALL_FIVE

    // 4 to a straight flush (all other shapes)
    const sfAny = find3SuitedSFWindow(naturals)
    if (sfAny) return [...deuceIndices, ...indicesOfSubset(cards, sfAny)]

    // 3 to a wild royal — but not with an ace: A-K/A-Q/A-J/A-T suited have a
    // single straight-flush window and lose to the bare deuce (exact EV)
    const r2 = findRoyal(naturals, 2)
    if (r2 && !r2.some(c => c.rank === 14)) return [...deuceIndices, ...indicesOfSubset(cards, r2)]

    // 3 to a straight flush: two suited consecutive naturals, 6-7 or higher
    const sf2 = findSuitedConsecutive2(naturals, 6)
    if (sf2) return [...deuceIndices, ...indicesOfSubset(cards, sf2)]

    // The deuce alone
    return deuceIndices
  }

  // ── 0 deuces ──
  const rc = getRankCounts(cards)
  const counts = getSortedCounts(rc)

  if (made === 'Natural Royal Flush') return ALL_FIVE

  // 4 to a royal beats even a pat straight flush
  const r4 = findRoyal(cards, 4)
  if (r4) return indicesOfSubset(cards, r4)

  if (made === 'Straight Flush') return ALL_FIVE

  // Natural quads: hold them, draw at five of a kind (a deuce completes it)
  if (counts[0] === 4) {
    const quadRank = [...rc.entries()].find(([, c]) => c === 4)![0]
    return indicesOf(cards, c => c.rank === quadRank)
  }

  if (made === 'Full House' || made === 'Flush' || made === 'Straight') return ALL_FIVE

  if (counts[0] === 3) {
    const tripRank = [...rc.entries()].find(([, c]) => c === 3)![0]
    return indicesOf(cards, c => c.rank === tripRank)
  }

  // 4 to a straight flush
  const sf4 = find4ToSF(cards)
  if (sf4) return indicesOfSubset(cards, sf4)

  // 3 to a royal
  const r3 = findRoyal(cards, 3)
  if (r3) return indicesOfSubset(cards, r3)

  // One pair — from two pair, hold only one (pairs pay nothing; kicker room matters)
  if (counts[0] === 2) {
    const pairRank = [...rc.entries()].find(([, c]) => c === 2)![0]
    return indicesOf(cards, c => c.rank === pairRank)
  }

  // 4 to a flush
  const f4 = findFlushDraw(cards, 4)
  if (f4) return indicesOfSubset(cards, f4)

  // 4 to an outside straight. 3-4-5-6 is not open-ended here: its low end
  // needs a deuce, which is already counted as a wild out, so it has the
  // same 8 outs as an inside draw and ranks with them.
  const st4 = find4ToOutsideStraight(cards)
  const st4Low = st4 ? Math.min(...st4.map(c => c.rank)) : 0
  if (st4 && st4Low >= 4) return indicesOfSubset(cards, st4)

  // 3 to a straight flush, at most one gap. Ace-low (A-3-4 etc.) needs a
  // deuce as the 2 and is worth less than a full redraw; two-gap draws rank
  // below the J/Q-high royal pairs.
  const sf3 = find3ToSF(cards)
  const sf3Live = sf3 && !sf3.picks.some(c => c.rank === 14) ? sf3 : null
  if (sf3Live && sf3Live.gaps <= 1) return indicesOfSubset(cards, sf3Live.picks)

  // 2 to a royal, J-T: four straight-flush windows make it worth more than
  // any inside straight or two-gap draw that contains it
  const jtRoyal = findSuitedRanks(cards, [[11, 10]])
  if (jtRoyal) return indicesOfSubset(cards, jtRoyal)

  // 4 to an inside straight with a high card (a wild deuce doubles the
  // completing outs). A-3-4-5 is excluded: its only outs are the deuces.
  const inside = find4ToInsideStraightDW(cards) ?? (st4 && st4Low === 3 ? { picks: st4, highs: 0 } : null)
  if (inside && inside.highs >= 1) return indicesOfSubset(cards, inside.picks)

  // 3 to a straight flush, two gaps
  if (sf3Live) return indicesOfSubset(cards, sf3Live.picks)

  // 2 to a royal, Q-J or Q-T (K-high loses to a redraw; A-high not at all)
  const qRoyal = findSuitedRanks(cards, [[12, 11], [12, 10]])
  if (qRoyal) return indicesOfSubset(cards, qRoyal)

  // 4 to an inside straight, no high cards
  if (inside) return indicesOfSubset(cards, inside.picks)

  // Discard everything
  return []
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Fast optimal hold lookup.
 * Dispatches to the correct strategy based on the pay table.
 */
export function fastOptimalHold(cards: Card[], payTable?: PayTableDef): number[] {
  const classifier = payTable?.classifier || 'standard'

  if (classifier === 'deucesWild') return deucesWildStrategy(cards)
  if (classifier === 'ddb') return ddbStrategy(cards)
  if (classifier === 'bonus' && payTable) return bonusStrategy(cards, payTable)
  if (payTable && getPayForHand(payTable, 'Two Pair', 1) === 1) {
    // Bonus Poker Deluxe: JoB shape, but the 1-coin two pair devalues every
    // pair-and-high-card hold relative to straight draws
    return jobStrategy(cards, {
      holdInsideStraightOverRedraw: true,
      insideTwoHighOverTwoHigh: true,
      fourHighInsideOverSuitedQJ: true,
      flushOverAceTenRoyal: true
    })
  }
  return jobStrategy(cards)
}
