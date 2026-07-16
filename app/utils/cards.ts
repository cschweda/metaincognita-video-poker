export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs' | 'joker'
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14

export interface Card {
  rank: Rank
  suit: Suit
  id: string
}

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']

export const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

export const RANK_LABELS: Record<number, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A'
}

export const RANK_NAMES: Record<number, string> = {
  2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven',
  8: 'Eight', 9: 'Nine', 10: 'Ten', 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace'
}

export const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '\u2660', hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', joker: '\u2605'
}

export const SUIT_NAMES: Record<Suit, string> = {
  spades: 'Spades', hearts: 'Hearts', diamonds: 'Diamonds', clubs: 'Clubs', joker: 'Joker'
}

export const SUIT_COLORS: Record<Suit, string> = {
  spades: '#1a1a2e',
  hearts: '#e63946',
  diamonds: '#e63946',
  clubs: '#2d6a4f',
  joker: '#7b2d8b'
}

export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, id: `${rank}${suit[0]}` })
    }
  }
  return deck
}

/**
 * Uniform integer in [0, n) from the CSPRNG, using rejection sampling so
 * every value is exactly equally likely (a bare modulo would bias low values
 * by ~n/2^32 — immaterial in practice, but exactness is this app's brand).
 */
function cryptoRandomInt(n: number): number {
  const limit = Math.floor(0x100000000 / n) * n
  const arr = new Uint32Array(1)
  let x: number
  do {
    crypto.getRandomValues(arr)
    x = arr[0]!
  } while (x >= limit)
  return x % n
}

export type RandInt = (n: number) => number

/**
 * Fisher-Yates shuffle. Real gameplay uses the CSPRNG default; simulation
 * and tests inject a seeded PRNG (see prng.ts) for speed and reproducibility.
 */
export function shuffle(deck: Card[], randInt: RandInt = cryptoRandomInt): Card[] {
  const d = [...deck]
  for (let i = d.length - 1; i > 0; i--) {
    const j = randInt(i + 1)
    ;[d[i], d[j]] = [d[j]!, d[i]!]
  }
  return d
}

export function cardLabel(card: Card): string {
  return `${RANK_LABELS[card.rank]}${SUIT_SYMBOLS[card.suit]}`
}

export function cardAriaLabel(card: Card): string {
  return `${RANK_NAMES[card.rank]} of ${SUIT_NAMES[card.suit]}`
}
