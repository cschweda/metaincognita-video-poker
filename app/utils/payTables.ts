export interface PayTableHand {
  name: string
  pays: number[] // indexed by coins - 1 (0..4)
}

export interface PayTableDef {
  id: string
  variant: string
  shortName: string
  returnPct: number
  classifier: 'standard' | 'bonus' | 'ddb' | 'deucesWild' | 'jokerPoker'
  hands: PayTableHand[]
}

// --- Jacks or Better pay tables ---

const JOB_HANDS = [
  'Royal Flush', 'Straight Flush', 'Four of a Kind', 'Full House',
  'Flush', 'Straight', 'Three of a Kind', 'Two Pair', 'Jacks or Better'
]

function jobTable(id: string, shortName: string, returnPct: number, fh: number, fl: number): PayTableDef {
  return {
    id,
    variant: 'Jacks or Better',
    shortName,
    returnPct,
    classifier: 'standard',
    hands: [
      { name: 'Royal Flush', pays: [250, 500, 750, 1000, 4000] },
      { name: 'Straight Flush', pays: [50, 100, 150, 200, 250] },
      { name: 'Four of a Kind', pays: [25, 50, 75, 100, 125] },
      { name: 'Full House', pays: mult(fh) },
      { name: 'Flush', pays: mult(fl) },
      { name: 'Straight', pays: mult(4) },
      { name: 'Three of a Kind', pays: mult(3) },
      { name: 'Two Pair', pays: mult(2) },
      { name: 'Jacks or Better', pays: mult(1) }
    ]
  }
}

function mult(base: number): number[] {
  return [base, base * 2, base * 3, base * 4, base * 5]
}

export const PAY_TABLES: Record<string, PayTableDef> = {
  'job-9-6': jobTable('job-9-6', '9/6', 99.54, 9, 6),
  'job-8-6': jobTable('job-8-6', '8/6', 98.39, 8, 6),
  'job-8-5': jobTable('job-8-5', '8/5', 97.30, 8, 5),
  'job-7-5': jobTable('job-7-5', '7/5', 96.15, 7, 5),
  'job-6-5': jobTable('job-6-5', '6/5', 95.00, 6, 5),

  'bonus-8-5': {
    id: 'bonus-8-5',
    variant: 'Bonus Poker',
    shortName: '8/5',
    returnPct: 99.17,
    classifier: 'bonus',
    hands: [
      { name: 'Royal Flush', pays: [250, 500, 750, 1000, 4000] },
      { name: 'Straight Flush', pays: [50, 100, 150, 200, 250] },
      { name: 'Four Aces', pays: mult(80) },
      { name: 'Four 2s-4s', pays: mult(40) },
      { name: 'Four 5s-Ks', pays: mult(25) },
      { name: 'Full House', pays: mult(8) },
      { name: 'Flush', pays: mult(5) },
      { name: 'Straight', pays: mult(4) },
      { name: 'Three of a Kind', pays: mult(3) },
      { name: 'Two Pair', pays: mult(2) },
      { name: 'Jacks or Better', pays: mult(1) }
    ]
  },

  'double-bonus-10-7': {
    id: 'double-bonus-10-7',
    variant: 'Double Bonus',
    shortName: '10/7',
    returnPct: 100.17,
    classifier: 'bonus',
    hands: [
      { name: 'Royal Flush', pays: [250, 500, 750, 1000, 4000] },
      { name: 'Straight Flush', pays: [50, 100, 150, 200, 250] },
      { name: 'Four Aces', pays: mult(160) },
      { name: 'Four 2s-4s', pays: mult(80) },
      { name: 'Four 5s-Ks', pays: mult(50) },
      { name: 'Full House', pays: mult(10) },
      { name: 'Flush', pays: mult(7) },
      { name: 'Straight', pays: mult(5) },
      { name: 'Three of a Kind', pays: mult(3) },
      { name: 'Two Pair', pays: mult(1) },
      { name: 'Jacks or Better', pays: mult(1) }
    ]
  },

  'bonus-deluxe-8-6': {
    id: 'bonus-deluxe-8-6',
    variant: 'Bonus Poker Deluxe',
    shortName: '8/6',
    returnPct: 98.49,
    classifier: 'standard',
    hands: [
      { name: 'Royal Flush', pays: [250, 500, 750, 1000, 4000] },
      { name: 'Straight Flush', pays: [50, 100, 150, 200, 250] },
      { name: 'Four of a Kind', pays: mult(80) },
      { name: 'Full House', pays: mult(8) },
      { name: 'Flush', pays: mult(6) },
      { name: 'Straight', pays: mult(4) },
      { name: 'Three of a Kind', pays: mult(3) },
      { name: 'Two Pair', pays: mult(1) },
      { name: 'Jacks or Better', pays: mult(1) }
    ]
  },

  'ddb-9-6': {
    id: 'ddb-9-6',
    variant: 'Double Double Bonus',
    shortName: '9/6',
    returnPct: 98.98,
    classifier: 'ddb',
    hands: [
      { name: 'Royal Flush', pays: [250, 500, 750, 1000, 4000] },
      { name: 'Straight Flush', pays: [50, 100, 150, 200, 250] },
      { name: 'Four Aces + 2-4', pays: mult(400) },
      { name: 'Four Aces + 5-K', pays: mult(160) },
      { name: 'Four 2s-4s + A-4', pays: mult(160) },
      { name: 'Four 2s-4s + 5-K', pays: mult(80) },
      { name: 'Four 5s-Ks', pays: mult(50) },
      { name: 'Full House', pays: mult(9) },
      { name: 'Flush', pays: mult(6) },
      { name: 'Straight', pays: mult(4) },
      { name: 'Three of a Kind', pays: mult(3) },
      { name: 'Two Pair', pays: mult(1) },
      { name: 'Jacks or Better', pays: mult(1) }
    ]
  },

  'deuces-wild-full': {
    id: 'deuces-wild-full',
    variant: 'Deuces Wild',
    shortName: 'Full Pay',
    returnPct: 100.76,
    classifier: 'deucesWild' as const,
    hands: [
      { name: 'Natural Royal Flush', pays: [250, 500, 750, 1000, 4000] },
      { name: 'Four Deuces', pays: mult(200) },
      { name: 'Wild Royal Flush', pays: mult(25) },
      { name: 'Five of a Kind', pays: mult(15) },
      { name: 'Straight Flush', pays: mult(9) },
      { name: 'Four of a Kind', pays: mult(5) },
      { name: 'Full House', pays: mult(3) },
      { name: 'Flush', pays: mult(2) },
      { name: 'Straight', pays: mult(2) },
      { name: 'Three of a Kind', pays: mult(1) }
    ]
  }
}

export interface PayTableGroup {
  variant: string
  tables: string[]
  description: string
}

export const PAY_TABLE_GROUPS: PayTableGroup[] = [
  { variant: 'Jacks or Better', tables: ['job-9-6', 'job-8-6', 'job-8-5', 'job-7-5', 'job-6-5'], description: 'Best for beginners, simple strategy, high return' },
  { variant: 'Bonus Poker Deluxe', tables: ['bonus-deluxe-8-6'], description: 'Balanced gameplay with solid returns' },
  { variant: 'Double Double Bonus', tables: ['ddb-9-6'], description: 'Higher variance, bigger payouts for certain hands' },
  { variant: 'Deuces Wild', tables: ['deuces-wild-full'], description: 'Wild cards increase winning opportunities' },
  { variant: 'Bonus Poker', tables: ['bonus-8-5'], description: 'Enhanced four-of-a-kind payouts' },
  { variant: 'Double Bonus', tables: ['double-bonus-10-7'], description: 'Massive four-of-a-kind bonuses, player advantage possible' }
]

export function getPayForHand(payTable: PayTableDef, handName: string, coins: number): number {
  const hand = payTable.hands.find(h => h.name === handName)
  if (!hand) return 0
  return hand.pays[coins - 1] ?? 0
}