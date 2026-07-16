/**
 * Visit all C(n, k) combinations of `k` items without materializing them.
 * The EV calculator's hold-nothing mask alone is C(47,5) = 1,533,939 draws —
 * building that as an array-of-arrays cost ~100MB of transient allocations
 * per analyzed hand, so enumeration reuses one scratch array. Consume the
 * callback's array synchronously and copy it if you need to keep it.
 */
export function forEachCombination<T>(items: T[], k: number, visit: (combo: T[]) => void): void {
  const combo: T[] = new Array(k)

  function recurse(start: number, depth: number) {
    if (depth === k) {
      visit(combo)
      return
    }
    for (let i = start; i <= items.length - (k - depth); i++) {
      combo[depth] = items[i]!
      recurse(i + 1, depth + 1)
    }
  }

  recurse(0, 0)
}

/**
 * Materialized combinations, in the same (lexicographic-by-index) order.
 * Only for small n/k — strategy-table subset checks on ≤5 cards.
 */
export function combinations<T>(items: T[], k: number): T[][] {
  const result: T[][] = []
  forEachCombination(items, k, combo => result.push([...combo]))
  return result
}
