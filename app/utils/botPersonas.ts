import type { Card } from './cards'
import type { PayTableDef } from './payTables'
import { getPayForHand } from './payTables'
import { fastOptimalHold } from './strategyLookup'
import { classifyHand, classifyBonusHand, classifyDDBHand } from './handClassifier'
import { classifyDeucesWild } from './wildClassifier'

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
    description: 'Uses the "simple strategy" — a simplified version of optimal that sacrifices ~0.08% return for much easier memorization. What a good recreational player looks like.',
    style: 'Simple strategy',
    expectedReturn: '99.4%'
  },
  {
    id: 'gut-feel-gary',
    name: 'Gut-Feel Gary',
    description: 'Makes common recreational mistakes: always holds kickers, never breaks a paying hand for a draw, prefers high cards over low pairs. Typical casino tourist.',
    style: 'Recreational mistakes',
    expectedReturn: '96-97%'
  },
  {
    id: 'superstitious-sam',
    name: 'Superstitious Sam',
    description: 'Believes in patterns and streaks. Holds "hot" suits, avoids cards that "haven\'t been paying". Strategy is effectively random with a bias toward holding more cards.',
    style: 'Pattern-chasing',
    expectedReturn: '94-95%'
  }
]

function classifyForPersona(cards: Card[], payTable: PayTableDef): string {
  if (payTable.classifier === 'deucesWild') return classifyDeucesWild(cards)
  if (payTable.classifier === 'ddb') return classifyDDBHand(cards)
  if (payTable.classifier === 'bonus') return classifyBonusHand(cards)
  return classifyHand(cards)
}

/**
 * Perfect Pat — plays exact optimal strategy via the published strategy tables.
 */
function perfectPatHold(cards: Card[], payTable: PayTableDef): number[] {
  return fastOptimalHold(cards, payTable)
}

/**
 * Almost Alice — simplified strategy. Correct on ~95% of hands.
 * Differences from optimal:
 * - Never holds 3 to a straight flush (too hard to spot)
 * - Doesn't differentiate suited vs unsuited high cards
 * - Simpler straight draw rules
 */
function almostAliceHold(cards: Card[], payTable: PayTableDef): number[] {
  const rc = new Map<number, number>()
  for (const c of cards) rc.set(c.rank, (rc.get(c.rank) || 0) + 1)
  const counts = [...rc.values()].sort((a, b) => b - a)
  const ranks = cards.map(c => c.rank).sort((a, b) => a - b)
  const fl = cards.every(c => c.suit === cards[0]!.suit)
  const uniqueRanks = [...new Set(ranks)].sort((a, b) => a - b)
  const st = uniqueRanks.length === 5 && (uniqueRanks[4]! - uniqueRanks[0]! === 4 || uniqueRanks.join(',') === '2,3,4,5,14')

  // Pat hands
  if (fl && st) return [0,1,2,3,4]
  if (counts[0]! >= 4) return [0,1,2,3,4]
  if (counts[0] === 3 && counts[1] === 2) return [0,1,2,3,4]
  if (fl) return [0,1,2,3,4]
  if (st) return [0,1,2,3,4]

  // Three of a kind
  if (counts[0] === 3) {
    const tripRank = [...rc.entries()].find(([,c]) => c === 3)![0]
    return cards.map((c, i) => c.rank === tripRank ? i : -1).filter(i => i >= 0)
  }

  // Two pair
  if (counts[0] === 2 && counts[1] === 2) {
    const pairRanks = [...rc.entries()].filter(([,c]) => c === 2).map(([r]) => r)
    return cards.map((c, i) => pairRanks.includes(c.rank) ? i : -1).filter(i => i >= 0)
  }

  // High pair
  if (counts[0] === 2) {
    const pairRank = [...rc.entries()].find(([,c]) => c === 2)![0]
    if (pairRank >= 11) return cards.map((c, i) => c.rank === pairRank ? i : -1).filter(i => i >= 0)
  }

  // 4 to a flush (Alice catches this)
  const suitCounts = new Map<string, Card[]>()
  for (const c of cards) {
    const arr = suitCounts.get(c.suit) || []
    arr.push(c)
    suitCounts.set(c.suit, arr)
  }
  for (const [, suited] of suitCounts) {
    if (suited.length >= 4) {
      const used = new Set<number>()
      return suited.slice(0, 4).map(sc => {
        for (let i = 0; i < cards.length; i++) {
          if (!used.has(i) && cards[i]!.rank === sc.rank && cards[i]!.suit === sc.suit) {
            used.add(i)
            return i
          }
        }
        return -1
      }).filter(i => i >= 0)
    }
  }

  // Low pair
  if (counts[0] === 2) {
    const pairRank = [...rc.entries()].find(([,c]) => c === 2)![0]
    return cards.map((c, i) => c.rank === pairRank ? i : -1).filter(i => i >= 0)
  }

  // Any high cards (simplified: just hold all high cards, no suited preference)
  const highIndices = cards.map((c, i) => c.rank >= 11 ? i : -1).filter(i => i >= 0)
  if (highIndices.length > 0) return highIndices.slice(0, 2)

  return []
}

/**
 * Gut-Feel Gary — common recreational mistakes.
 * - Always holds a kicker alongside a pair
 * - Never breaks a paying hand (even for a better draw)
 * - Prefers high cards over low pairs
 * - Holds Ace even when low pair is better
 */
function gutFeelGaryHold(cards: Card[]): number[] {
  const rc = new Map<number, number>()
  for (const c of cards) rc.set(c.rank, (rc.get(c.rank) || 0) + 1)
  const counts = [...rc.values()].sort((a, b) => b - a)
  const ranks = cards.map(c => c.rank).sort((a, b) => a - b)
  const fl = cards.every(c => c.suit === cards[0]!.suit)
  const uniqueRanks = [...new Set(ranks)].sort((a, b) => a - b)
  const st = uniqueRanks.length === 5 && (uniqueRanks[4]! - uniqueRanks[0]! === 4 || uniqueRanks.join(',') === '2,3,4,5,14')

  // Gary never breaks a paying hand
  if (fl && st) return [0,1,2,3,4]
  if (counts[0]! >= 4) return [0,1,2,3,4]
  if (counts[0] === 3 && counts[1] === 2) return [0,1,2,3,4]
  if (fl) return [0,1,2,3,4]
  if (st) return [0,1,2,3,4]

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
function superstitiousSamHold(cards: Card[]): number[] {
  // Deterministic "random" based on card values for reproducibility
  const seed = cards.reduce((s, c) => s + c.rank * 17 + (c.suit === 'hearts' ? 1 : c.suit === 'diamonds' ? 2 : c.suit === 'clubs' ? 3 : 4), 0)

  // 10% chance: hold all 5 ("hot hand")
  if (seed % 10 === 0) return [0,1,2,3,4]

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

/**
 * Replay a set of dealt hands through a persona's strategy.
 * Returns what the persona would have earned.
 */
export function replayHandsThroughPersona(
  personaId: string,
  dealtHands: { cards: Card[], remaining: Card[] }[],
  payTable: PayTableDef,
  coins: number
): PersonaResult {
  const persona = PERSONAS.find(p => p.id === personaId)!
  let totalPayout = 0
  const totalWagered = dealtHands.length * coins
  const handResults: { handName: string | null, payout: number }[] = []

  for (const { cards, remaining } of dealtHands) {
    // Get persona's hold decision
    let heldIndices: number[]
    switch (personaId) {
      case 'perfect-pat':
        heldIndices = perfectPatHold(cards, payTable)
        break
      case 'almost-alice':
        heldIndices = almostAliceHold(cards, payTable)
        break
      case 'gut-feel-gary':
        heldIndices = gutFeelGaryHold(cards)
        break
      case 'superstitious-sam':
        heldIndices = superstitiousSamHold(cards)
        break
      default:
        heldIndices = perfectPatHold(cards, payTable)
    }

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

    // Classify and pay
    const handName = classifyForPersona(finalHand, payTable)
    const payout = handName === 'Nothing' ? 0 : getPayForHand(payTable, handName, coins)
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
