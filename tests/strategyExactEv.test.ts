import { describe, it, expect } from 'vitest'
import { createDeck, cardLabel } from '../app/utils/cards'
import { PAY_TABLES } from '../app/utils/payTables'
import { analyzeHand } from '../app/utils/evCalculator'
import { fastOptimalHold } from '../app/utils/strategyLookup'
import { makeRng, prngInt } from '../app/utils/prng'
import { DECK, N5, buildTables, evAllMasks, maskOf } from './helpers/exactEv'
import type { Tables } from './helpers/exactEv'

/**
 * The strategy tables graded against exact EV at scale.
 *
 * tests/strategyLookup.test.ts checks individual rule classes with the
 * brute-force analyzer (~1.3 s per hand). This suite uses the sum-table
 * engine from the 2026-09-05 audit — every hold's exact EV as a handful of
 * lookups — so it can grade hundreds of thousands of deals per pay table in
 * seconds and hold the table to the audit's measured loss.
 */

const ALL_TABLES = Object.keys(PAY_TABLES)
const SAMPLE = 200_000

// Exhaustive loss (pp of return) measured by the audit, plus headroom for
// sampling noise (~±0.001 pp at 200k deals). A regression in any rule class
// shows up as a jump well past these.
const MAX_LOSS_PP = 0.012

const tablesById = new Map<string, Tables>()
function tablesFor(id: string): Tables {
  let t = tablesById.get(id)
  if (!t) {
    t = buildTables(PAY_TABLES[id]!)
    tablesById.set(id, t)
  }
  return t
}

function randomDeal(rng: () => number): number[] {
  const picked = new Set<number>()
  while (picked.size < 5) picked.add(prngInt(rng, 52))
  return [...picked].sort((a, b) => a - b)
}

describe('exact-EV engine', () => {
  it('agrees with the brute-force analyzer on every hold mask', () => {
    const rng = makeRng(0xE7AC7)
    for (const id of ['job-9-6', 'ddb-9-6', 'deuces-wild-full']) {
      const pt = PAY_TABLES[id]!
      const t = tablesFor(id)
      for (let h = 0; h < 2; h++) {
        const dealt = randomDeal(rng)
        const cards = dealt.map(i => DECK[i]!)
        const ids = new Set(cards.map(c => c.id))
        const remaining = createDeck().filter(c => !ids.has(c.id))
        const ev = evAllMasks(t, dealt)
        for (const opt of analyzeHand(cards, pt, remaining, 5)) {
          expect(ev[maskOf(opt.heldIndices)], `${id} ${cards.map(cardLabel).join(' ')} hold [${opt.heldIndices}]`)
            .toBeCloseTo(opt.expectedValue, 9)
        }
      }
    }
  }, 120_000)

  it('reproduces the published return of every pay table', () => {
    // Mean best EV over a large sample converges on the exact optimal return;
    // 200k deals leaves ~±0.15 pp of noise, well inside the tolerance.
    for (const id of ALL_TABLES) {
      const pt = PAY_TABLES[id]!
      const t = tablesFor(id)
      const rng = makeRng(0x0B7A1)
      const ev = new Float64Array(32)
      let sum = 0
      for (let n = 0; n < SAMPLE; n++) {
        evAllMasks(t, randomDeal(rng), ev)
        let best = -1
        for (let m = 0; m < 32; m++) if (ev[m]! > best) best = ev[m]!
        sum += best
      }
      const returnPct = (sum / SAMPLE) * 100
      expect(Math.abs(returnPct - pt.returnPct), `${id}: sampled optimal ${returnPct.toFixed(3)}% vs published ${pt.returnPct}%`)
        .toBeLessThan(0.5)
    }
  }, 300_000)
})

describe('strategy tables vs exact EV (200k-deal sample per pay table)', () => {
  it(`lose at most ${MAX_LOSS_PP} pp of return and never more than 0.1 EV/coin on one hand`, () => {
    for (const id of ALL_TABLES) {
      const pt = PAY_TABLES[id]!
      const t = tablesFor(id)
      const rng = makeRng(0x5A3E)
      const ev = new Float64Array(32)
      let sumOpt = 0
      let sumTable = 0
      let worst = 0
      let worstHand = ''
      for (let n = 0; n < SAMPLE; n++) {
        const dealt = randomDeal(rng)
        evAllMasks(t, dealt, ev)
        let best = -1
        for (let m = 0; m < 32; m++) if (ev[m]! > best) best = ev[m]!
        const cards = dealt.map(i => DECK[i]!)
        const chosen = ev[maskOf(fastOptimalHold(cards, pt))]!
        sumOpt += best
        sumTable += chosen
        if (best - chosen > worst) {
          worst = best - chosen
          worstHand = cards.map(cardLabel).join(' ')
        }
      }
      const lossPP = ((sumOpt - sumTable) / SAMPLE) * 100
      expect(lossPP, `${id}: table loses ${lossPP.toFixed(4)} pp vs exact`).toBeLessThan(MAX_LOSS_PP)
      expect(worst, `${id}: worst single hand ${worstHand} loses ${worst.toFixed(4)} EV/coin`).toBeLessThan(0.1)
    }
  }, 300_000)

  it('grades every one of the 2,598,960 deals on the two tables that leaked most', () => {
    // Full-deck pass on 10/7 Double Bonus and full-pay Deuces Wild — the two
    // variants where the pre-audit tables lost 0.19 and 0.074 pp. ~25 s each.
    for (const id of ['double-bonus-10-7', 'deuces-wild-full']) {
      const pt = PAY_TABLES[id]!
      const t = tablesFor(id)
      const ev = new Float64Array(32)
      const dealt = [0, 0, 0, 0, 0]
      let sumOpt = 0
      let sumTable = 0
      for (let a = 0; a < 48; a++) for (let b = a + 1; b < 49; b++) for (let c = b + 1; c < 50; c++) for (let d = c + 1; d < 51; d++) for (let e = d + 1; e < 52; e++) {
        dealt[0] = a
        dealt[1] = b
        dealt[2] = c
        dealt[3] = d
        dealt[4] = e
        evAllMasks(t, dealt, ev)
        let best = -1
        for (let m = 0; m < 32; m++) if (ev[m]! > best) best = ev[m]!
        sumOpt += best
        sumTable += ev[maskOf(fastOptimalHold([DECK[a]!, DECK[b]!, DECK[c]!, DECK[d]!, DECK[e]!], pt))]!
      }
      const optimalPct = (sumOpt / N5) * 100
      const lossPP = ((sumOpt - sumTable) / N5) * 100
      expect(Math.abs(optimalPct - pt.returnPct), `${id}: exact optimal ${optimalPct.toFixed(4)}% vs published ${pt.returnPct}%`).toBeLessThan(0.005)
      expect(lossPP, `${id}: table loses ${lossPP.toFixed(4)} pp vs exact over every deal`).toBeLessThan(0.008)
    }
  }, 300_000)
})
