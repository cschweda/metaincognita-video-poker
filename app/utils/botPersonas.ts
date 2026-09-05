import type { Card } from './cards'
import type { PayTableDef } from './payTables'
import { PAY_TABLES, getPayForHand } from './payTables'
import {
  fastOptimalHold, findRoyal, find4ToSF, findFlushDraw, find4ToOutsideStraight,
  find3ToSF, findSuitedRanks, indicesOfSubset
} from './strategyLookup'
import { classifyForPayTable } from './classify'
import { handShape } from './handShape'

const ALL_FIVE = [0, 1, 2, 3, 4]

/**
 * Bot personas for video poker comparison.
 *
 * Unlike Hold'em where players have "styles", video poker has ONE correct
 * play per hand. What differs is the TYPE of mistakes people make.
 * These personas model common mistake patterns observed in real players.
 *
 * After each session, the player's dealt hands are replayed through each
 * persona to show: "Here's how you did vs. how they would have done."
 */

export interface BotPersona {
  id: string
  name: string
  description: string
  style: string
  expectedReturn: string // approximate range
}

export const PERSONAS: BotPersona[] = [
  {
    id: 'perfect-pat',
    name: 'Perfect Pat',
    description: 'Plays mathematically optimal strategy on every hand. The benchmark — this is the theoretical maximum return.',
    style: 'Brute-force optimal',
    expectedReturn: '99.5%'
  },
  {
    id: 'almost-alice',
    name: 'Almost Alice',
    description: 'Plays the published 16-line "simple strategy" for Jacks or Better — no penalty cards, no straight-flush fine print. About 0.1% behind optimal on 9/6. What a good recreational player looks like.',
    style: 'Simple strategy',
    expectedReturn: '99.4% on 9/6 JoB'
  },
  {
    id: 'gut-feel-gary',
    name: 'Gut-Feel Gary',
    description: 'Makes common recreational mistakes: always holds kickers, never breaks a paying hand for a draw, prefers high cards over low pairs. Typical casino tourist.',
    style: 'Recreational mistakes',
    expectedReturn: '92.6% on 9/6 JoB'
  },
  {
    id: 'superstitious-sam',
    name: 'Superstitious Sam',
    description: 'Believes in patterns and streaks. Holds "hot" suits, avoids cards that "haven\'t been paying". Strategy is effectively random with a bias toward holding more cards — and random play returns about a third of the wager.',
    style: 'Pattern-chasing',
    expectedReturn: '35% on 9/6 JoB'
  }
]

/**
 * Perfect Pat — plays exact optimal strategy via the published strategy tables.
 */
function perfectPatHold(cards: Card[], payTable: PayTableDef): number[] {
  return fastOptimalHold(cards, payTable)
}

/**
 * Almost Alice — the Wizard of Odds "simple strategy" for Jacks or Better,
 * all 16 lines of it: no penalty cards, no straight-flush typing, and the
 * only suited/unsuited distinction is "two suited high cards". Exact
 * expected return over every deal on 9/6: 99.4%, about 0.1 pp behind the
 * full table. Every persona except Perfect Pat plays Jacks-or-Better
 * strategy on every variant — see personaHold for what that means with
 * wild cards.
 */
export function almostAliceHold(cards: Card[]): number[] {
  const { rankCounts: rc, counts, isFlush: fl, isStraight: st } = handShape(cards)
  const pairRank = counts[0] === 2 ? [...rc.entries()].find(([, n]) => n === 2)![0] : null
  const ofRank = (rank: number) => cards.map((c, i) => c.rank === rank ? i : -1).filter(i => i >= 0)

  // 1. Four of a kind, straight flush, royal flush
  if (fl && st) return ALL_FIVE
  if (counts[0]! >= 4) return ALL_FIVE

  // 2. Four to a royal flush
  const royal4 = findRoyal(cards, 4)
  if (royal4) return indicesOfSubset(cards, royal4)

  // 3. Three of a kind, straight, flush, full house
  if (counts[0] === 3 && counts[1] === 2) return ALL_FIVE
  if (fl || st) return ALL_FIVE
  if (counts[0] === 3) return ofRank([...rc.entries()].find(([, n]) => n === 3)![0])

  // 4. Four to a straight flush
  const sf4 = find4ToSF(cards)
  if (sf4) return indicesOfSubset(cards, sf4)

  // 5. Two pair
  if (counts[0] === 2 && counts[1] === 2) {
    const pairRanks = [...rc.entries()].filter(([, n]) => n === 2).map(([r]) => r)
    return cards.map((c, i) => pairRanks.includes(c.rank) ? i : -1).filter(i => i >= 0)
  }

  // 6. High pair
  if (pairRank !== null && pairRank >= 11) return ofRank(pairRank)

  // 7. Three to a royal flush
  const royal3 = findRoyal(cards, 3)
  if (royal3) return indicesOfSubset(cards, royal3)

  // 8. Four to a flush
  const flush4 = findFlushDraw(cards, 4)
  if (flush4) return indicesOfSubset(cards, flush4)

  // 9. Low pair
  if (pairRank !== null) return ofRank(pairRank)

  // 10. Four to an outside straight
  const straight4 = find4ToOutsideStraight(cards)
  if (straight4) return indicesOfSubset(cards, straight4)

  // 11. Two suited high cards
  const suitedHigh = findSuitedRanks(cards, [[14, 13], [14, 12], [14, 11], [13, 12], [13, 11], [12, 11]])
  if (suitedHigh) return indicesOfSubset(cards, suitedHigh)

  // 12. Three to a straight flush
  const sf3 = find3ToSF(cards)
  if (sf3) return indicesOfSubset(cards, sf3.picks)

  // 13. Two unsuited high cards (with more than two, the lowest two)
  const highs = cards
    .map((c, i) => ({ rank: c.rank, i }))
    .filter(x => x.rank >= 11)
    .sort((a, b) => a.rank - b.rank)
  if (highs.length >= 2) return [highs[0]!.i, highs[1]!.i].sort((a, b) => a - b)

  // 14. Suited T-J, T-Q or T-K
  const suitedTen = findSuitedRanks(cards, [[11, 10], [12, 10], [13, 10]])
  if (suitedTen) return indicesOfSubset(cards, suitedTen)

  // 15. One high card
  if (highs.length === 1) return [highs[0]!.i]

  // 16. Discard everything
  return []
}

/**
 * Gut-Feel Gary — common recreational mistakes.
 * - Always holds a kicker alongside a pair
 * - Never breaks a paying hand (even for a better draw)
 * - Prefers high cards over low pairs
 * - Holds Ace even when low pair is better
 */
export function gutFeelGaryHold(cards: Card[]): number[] {
  const { rankCounts: rc, counts, isFlush: fl, isStraight: st } = handShape(cards)

  // Gary never breaks a paying hand
  if (fl && st) return [0, 1, 2, 3, 4]
  if (counts[0]! >= 4) return [0, 1, 2, 3, 4]
  if (counts[0] === 3 && counts[1] === 2) return [0, 1, 2, 3, 4]
  if (fl) return [0, 1, 2, 3, 4]
  if (st) return [0, 1, 2, 3, 4]

  // Three of a kind — Gary holds a kicker too (mistake!)
  if (counts[0] === 3) {
    const tripRank = [...rc.entries()].find(([,c]) => c === 3)![0]
    const tripIndices = cards.map((c, i) => c.rank === tripRank ? i : -1).filter(i => i >= 0)
    // Hold trips + highest remaining card
    const remaining = cards.map((c, i) => tripIndices.includes(i) ? null : { rank: c.rank, idx: i }).filter(Boolean) as { rank: number, idx: number }[]
    remaining.sort((a, b) => b.rank - a.rank)
    if (remaining.length > 0) return [...tripIndices, remaining[0]!.idx]
    return tripIndices
  }

  // Two pair — holds correctly
  if (counts[0] === 2 && counts[1] === 2) {
    const pairRanks = [...rc.entries()].filter(([,c]) => c === 2).map(([r]) => r)
    return cards.map((c, i) => pairRanks.includes(c.rank) ? i : -1).filter(i => i >= 0)
  }

  // MISTAKE: Gary prefers Ace kicker over holding just the low pair
  if (counts[0] === 2) {
    const pairRank = [...rc.entries()].find(([,c]) => c === 2)![0]
    const pairIndices = cards.map((c, i) => c.rank === pairRank ? i : -1).filter(i => i >= 0)

    // If pair is low AND there's an Ace, hold pair + Ace (mistake)
    if (pairRank < 11) {
      const aceIdx = cards.findIndex(c => c.rank === 14)
      if (aceIdx >= 0) return [...pairIndices, aceIdx]
    }
    return pairIndices
  }

  // Gary holds ALL high cards (even 3 unsuited ones — mistake)
  const highIndices = cards.map((c, i) => c.rank >= 11 ? i : -1).filter(i => i >= 0)
  if (highIndices.length > 0) return highIndices

  // Holds any Ace
  const aceIdx = cards.findIndex(c => c.rank === 14)
  if (aceIdx >= 0) return [aceIdx]

  return []
}

/**
 * Superstitious Sam — pattern-chasing, effectively random with bias.
 * - Holds 3 random cards on average
 * - Slight bias toward high cards and suited cards
 * - Sometimes holds all 5 ("feeling lucky")
 * - Sometimes discards all ("clean slate")
 */
export function superstitiousSamHold(cards: Card[]): number[] {
  // Deterministic "random" based on card values for reproducibility
  const seed = cards.reduce((s, c) => s + c.rank * 17 + (c.suit === 'hearts' ? 1 : c.suit === 'diamonds' ? 2 : c.suit === 'clubs' ? 3 : 4), 0)

  // 10% chance: hold all 5 ("hot hand")
  if (seed % 10 === 0) return [0, 1, 2, 3, 4]

  // 8% chance: discard all ("clean slate")
  if (seed % 13 === 0) return []

  // Otherwise: hold cards based on a quirky preference
  const held: number[] = []
  for (let i = 0; i < 5; i++) {
    const c = cards[i]!
    let keep = false

    // Sam likes face cards
    if (c.rank >= 11) keep = true
    // Sam likes hearts ("lucky suit")
    if (c.suit === 'hearts') keep = (seed + i) % 3 !== 0
    // Sam avoids low black cards
    if (c.rank <= 6 && (c.suit === 'spades' || c.suit === 'clubs')) keep = false
    // Random factor
    if ((seed * (i + 1)) % 7 < 3) keep = !keep

    if (keep) held.push(i)
  }

  // Sam never holds more than 4 (always wants at least 1 new card)
  if (held.length === 5) held.pop()

  return held
}

// ─── Persona dispatch ───────────────────────────────────────

const DW_PAYING_HANDS = new Set([
  'Natural Royal Flush', 'Four Deuces', 'Wild Royal Flush', 'Five of a Kind',
  'Straight Flush', 'Four of a Kind', 'Full House', 'Flush', 'Straight', 'Three of a Kind'
])

/**
 * The hold a persona makes on a dealt hand under a pay table.
 *
 * Alice, Gary and Sam play Jacks-or-Better strategy everywhere — they are
 * recreational players, not variant experts. Two things even a tourist
 * knows on a Deuces Wild machine, though: a deuce is never thrown away,
 * and a hand the machine is already paying for is not broken up (Sam,
 * whose play is random, keeps only the first of those). Without this the
 * comparison on Deuces Wild was meaningless: Alice would discard the deuce
 * from a dealt wild royal to keep four hearts.
 */
export function personaHold(personaId: string, cards: Card[], payTable: PayTableDef, optimalHeld?: number[]): number[] {
  if (personaId === 'perfect-pat') {
    // Prefer the exact brute-force-optimal hold recorded during play;
    // the strategy table is only a fallback approximation.
    return optimalHeld ?? perfectPatHold(cards, payTable)
  }

  const isDeucesWild = payTable.classifier === 'deucesWild'
  if (isDeucesWild && personaId !== 'superstitious-sam' && DW_PAYING_HANDS.has(classifyForPayTable(cards, payTable))) {
    return ALL_FIVE
  }

  let held: number[]
  switch (personaId) {
    case 'almost-alice':
      held = almostAliceHold(cards)
      break
    case 'gut-feel-gary':
      held = gutFeelGaryHold(cards)
      break
    case 'superstitious-sam':
      held = superstitiousSamHold(cards)
      break
    default:
      held = perfectPatHold(cards, payTable)
  }

  if (isDeucesWild) {
    const deuces = cards.map((c, i) => c.rank === 2 ? i : -1).filter(i => i >= 0)
    held = [...new Set([...held, ...deuces])].sort((a, b) => a - b)
  }
  return held
}

// ─── Persona replay ─────────────────────────────────────────

export interface PersonaResult {
  personaId: string
  personaName: string
  totalPayout: number
  totalWagered: number
  returnPct: number
  handsPlayed: number
  handResults: { handName: string | null, payout: number }[]
}

export interface DealtHand {
  cards: Card[]
  remaining: Card[]
  /** Exact-optimal hold indices recorded by the brute-force EV analysis during play */
  optimalHeld?: number[]
  /** Pay table the hand was actually dealt on (sessions can switch tables mid-way) */
  payTableId?: string
}

/**
 * Replay a set of dealt hands through a persona's strategy.
 * Returns what the persona would have earned.
 */
export function replayHandsThroughPersona(
  personaId: string,
  dealtHands: DealtHand[],
  payTable: PayTableDef,
  coins: number
): PersonaResult {
  const persona = PERSONAS.find(p => p.id === personaId)!
  let totalPayout = 0
  const totalWagered = dealtHands.length * coins
  const handResults: { handName: string | null, payout: number }[] = []

  for (const { cards, remaining, optimalHeld, payTableId } of dealtHands) {
    // Score each hand under the table it was actually dealt on
    const handTable = (payTableId && PAY_TABLES[payTableId]) || payTable

    // Get persona's hold decision
    const heldIndices = personaHold(personaId, cards, handTable, optimalHeld)

    // Execute the hold: draw from remaining deck
    const finalHand = [...cards]
    const heldSet = new Set(heldIndices)
    let drawIdx = 0
    for (let j = 0; j < 5; j++) {
      if (!heldSet.has(j)) {
        finalHand[j] = remaining[drawIdx]!
        drawIdx++
      }
    }

    // Classify and pay under the hand's own table
    const handName = classifyForPayTable(finalHand, handTable)
    const payout = handName === 'Nothing' ? 0 : getPayForHand(handTable, handName, coins)
    totalPayout += payout
    handResults.push({
      handName: handName === 'Nothing' ? null : handName,
      payout
    })
  }

  return {
    personaId,
    personaName: persona.name,
    totalPayout,
    totalWagered,
    returnPct: totalWagered > 0 ? (totalPayout / totalWagered) * 100 : 0,
    handsPlayed: dealtHands.length,
    handResults
  }
}
