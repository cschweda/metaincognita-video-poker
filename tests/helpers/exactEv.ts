import type { Card } from '../../app/utils/cards'
import { createDeck } from '../../app/utils/cards'
import type { PayTableDef } from '../../app/utils/payTables'
import { getPayForHand } from '../../app/utils/payTables'
import { classifyForPayTable } from '../../app/utils/classify'

/**
 * Exact-EV engine for grading strategy tables at scale (test-only).
 *
 * For a pay table, build inclusion–exclusion sum tables
 *   T_k(X) = Σ pay(F) over every 5-card hand F ⊇ X, |X| = k (k = 0..5),
 * from the app's own classifier and pay table. Then for a dealt hand D with
 * held set H and discards B = D \ H, the total pay over every possible draw is
 *   Σ_{S ⊆ B} (−1)^{|S|} · T(H ∪ S),
 * so every one of the 32 holds costs at most 32 lookups instead of an
 * enumeration of up to C(47,5) = 1,533,939 draws. Building the tables is one
 * pass over the 2,598,960 hands (~2–3 s); grading a deal is microseconds.
 *
 * Verified against analyzeHand to floating-point identity (see
 * tests/strategyExactEv.test.ts) and used for the 2026-09-05 audit.
 */

/** The 52 cards in createDeck() order: index = suit × 13 + (rank − 2). */
export const DECK: Card[] = createDeck()
export const COINS = 5

// Binomial coefficients C[n][k] for n ≤ 52, k ≤ 5
const C: number[][] = []
for (let n = 0; n <= 52; n++) {
  C[n] = [1, 0, 0, 0, 0, 0]
  for (let k = 1; k <= 5; k++) {
    C[n]![k] = n >= k ? (C[n - 1]?.[k - 1] ?? 0) + (C[n - 1]?.[k] ?? 0) : 0
  }
}
const C1 = new Int32Array(52)
const C2 = new Int32Array(52)
const C3 = new Int32Array(52)
const C4 = new Int32Array(52)
const C5 = new Int32Array(52)
for (let x = 0; x < 52; x++) {
  C1[x] = C[x]![1]!
  C2[x] = C[x]![2]!
  C3[x] = C[x]![3]!
  C4[x] = C[x]![4]!
  C5[x] = C[x]![5]!
}

/** C(52, 5) = 2,598,960 possible deals */
export const N5 = C[52]![5]!

export interface Tables {
  payTable: PayTableDef
  T0: number
  T1: Float64Array
  T2: Float64Array
  T3: Float64Array
  T4: Float64Array
  T5: Uint16Array
}

function payOf(cards: Card[], pt: PayTableDef): number {
  const name = classifyForPayTable(cards, pt)
  return name === 'Nothing' ? 0 : getPayForHand(pt, name, COINS)
}

/** Build the sum tables for a pay table — one pass over every 5-card hand. */
export function buildTables(pt: PayTableDef): Tables {
  const T1 = new Float64Array(52)
  const T2 = new Float64Array(C[52]![2]!)
  const T3 = new Float64Array(C[52]![3]!)
  const T4 = new Float64Array(C[52]![4]!)
  const T5 = new Uint16Array(N5)
  let T0 = 0
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
            const pay = payOf(hand, pt)
            if (pay === 0) continue
            T0 += pay
            T5[C1[a]! + C2[b]! + C3[c]! + C4[d]! + C5[e]!] = pay
            // every 4-subset
            T4[C1[b]! + C2[c]! + C3[d]! + C4[e]!] += pay
            T4[C1[a]! + C2[c]! + C3[d]! + C4[e]!] += pay
            T4[C1[a]! + C2[b]! + C3[d]! + C4[e]!] += pay
            T4[C1[a]! + C2[b]! + C3[c]! + C4[e]!] += pay
            T4[C1[a]! + C2[b]! + C3[c]! + C4[d]!] += pay
            // every 3-subset
            T3[C1[a]! + C2[b]! + C3[c]!] += pay
            T3[C1[a]! + C2[b]! + C3[d]!] += pay
            T3[C1[a]! + C2[b]! + C3[e]!] += pay
            T3[C1[a]! + C2[c]! + C3[d]!] += pay
            T3[C1[a]! + C2[c]! + C3[e]!] += pay
            T3[C1[a]! + C2[d]! + C3[e]!] += pay
            T3[C1[b]! + C2[c]! + C3[d]!] += pay
            T3[C1[b]! + C2[c]! + C3[e]!] += pay
            T3[C1[b]! + C2[d]! + C3[e]!] += pay
            T3[C1[c]! + C2[d]! + C3[e]!] += pay
            // every 2-subset
            T2[C1[a]! + C2[b]!] += pay
            T2[C1[a]! + C2[c]!] += pay
            T2[C1[a]! + C2[d]!] += pay
            T2[C1[a]! + C2[e]!] += pay
            T2[C1[b]! + C2[c]!] += pay
            T2[C1[b]! + C2[d]!] += pay
            T2[C1[b]! + C2[e]!] += pay
            T2[C1[c]! + C2[d]!] += pay
            T2[C1[c]! + C2[e]!] += pay
            T2[C1[d]! + C2[e]!] += pay
            // every single card
            T1[a] += pay
            T1[b] += pay
            T1[c] += pay
            T1[d] += pay
            T1[e] += pay
          }
        }
      }
    }
  }
  return { payTable: pt, T0, T1, T2, T3, T4, T5 }
}

const POPCOUNT = new Int8Array(32)
for (let m = 0; m < 32; m++) {
  POPCOUNT[m] = (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1) + ((m >> 4) & 1)
}

// Number of draws for a hold of k cards: C(47, 5 − k)
const DRAWS = [C[47]![5]!, C[47]![4]!, C[47]![3]!, C[47]![2]!, C[47]![1]!, 1]

const subsetSums = new Float64Array(32)

/**
 * Exact per-coin EV of all 32 hold masks for a dealt hand given as five
 * deck indices in ascending order. Bit i of a mask ⇔ dealt[i] is held.
 */
export function evAllMasks(t: Tables, dealt: number[], out: Float64Array = new Float64Array(32)): Float64Array {
  // T(X) for every subset X of the five dealt positions
  for (let x = 0; x < 32; x++) {
    let idx = 0
    let k = 0
    for (let i = 0; i < 5; i++) {
      if (x & (1 << i)) {
        k++
        const v = dealt[i]!
        idx += k === 1 ? C1[v]! : k === 2 ? C2[v]! : k === 3 ? C3[v]! : k === 4 ? C4[v]! : C5[v]!
      }
    }
    subsetSums[x] = k === 0 ? t.T0 : k === 1 ? t.T1[idx]! : k === 2 ? t.T2[idx]! : k === 3 ? t.T3[idx]! : k === 4 ? t.T4[idx]! : t.T5[idx]!
  }
  for (let m = 0; m < 32; m++) {
    const discards = (~m) & 31
    let sum = 0
    let s = discards
    // Σ over subsets s of the discards, alternating sign by |s|
    for (;;) {
      const term = subsetSums[m | s]!
      sum += (POPCOUNT[s]! & 1) ? -term : term
      if (s === 0) break
      s = (s - 1) & discards
    }
    out[m] = sum / (DRAWS[POPCOUNT[m]!]! * COINS)
  }
  return out
}

/** Hold indices → 5-bit mask */
export function maskOf(indices: number[]): number {
  let m = 0
  for (const i of indices) m |= 1 << i
  return m
}

/** 5-bit mask → hold indices */
export function indicesOfMask(m: number): number[] {
  const r: number[] = []
  for (let i = 0; i < 5; i++) if (m & (1 << i)) r.push(i)
  return r
}
