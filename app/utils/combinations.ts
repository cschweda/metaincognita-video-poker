import type { Card } from './cards'

/**
 * Generate all C(n, k) combinations of cards from a given array.
 * Used by the EV calculator to enumerate all possible draws.
 */
export function combinations(cards: Card[], k: number): Card[][] {
  const result: Card[][] = []
  const combo: Card[] = []

  function recurse(start: number, depth: number) {
    if (depth === k) {
      result.push([...combo])
      return
    }
    for (let i = start; i <= cards.length - (k - depth); i++) {
      combo[depth] = cards[i]!
      recurse(i + 1, depth + 1)
    }
  }

  recurse(0, 0)
  return result
}
