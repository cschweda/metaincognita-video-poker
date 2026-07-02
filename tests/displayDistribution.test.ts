import { describe, it, expect } from 'vitest'
import { buildDisplayDistribution } from '../app/utils/evCalculator'
import { PAY_TABLES } from '../app/utils/payTables'

/**
 * The training panel renders one outcome row per pay-table hand plus
 * "Nothing", regardless of which holds are selected. A constant row count
 * is what keeps the panel height stable while toggling holds — a variable
 * list caused the page height to wobble around the viewport boundary,
 * flickering the window scrollbar (layout zig-zag).
 */
describe('buildDisplayDistribution', () => {
  const job = PAY_TABLES['job-9-6']!

  it('returns one row per pay-table hand plus Nothing, in pay-table order', () => {
    const rows = buildDisplayDistribution({ 'Jacks or Better': 0.3, 'Nothing': 0.7 }, job)
    expect(rows.map(r => r.name)).toEqual([...job.hands.map(h => h.name), 'Nothing'])
  })

  it('row count is identical for sparse and rich distributions', () => {
    const sparse = buildDisplayDistribution({ Nothing: 1 }, job)
    const rich = buildDisplayDistribution({
      'Royal Flush': 0.0001,
      'Straight Flush': 0.0002,
      'Flush': 0.1,
      'Jacks or Better': 0.4,
      'Nothing': 0.4997
    }, job)
    expect(sparse.length).toBe(rich.length)
  })

  it('fills missing hands with probability 0 and keeps given probabilities', () => {
    const rows = buildDisplayDistribution({ 'Two Pair': 0.25, 'Nothing': 0.75 }, job)
    const byName = Object.fromEntries(rows.map(r => [r.name, r.prob]))
    expect(byName['Two Pair']).toBe(0.25)
    expect(byName['Nothing']).toBe(0.75)
    expect(byName['Royal Flush']).toBe(0)
    expect(byName['Full House']).toBe(0)
  })

  it('works for wild variants with their own hand names', () => {
    const dw = PAY_TABLES['dw-full-pay'] ?? Object.values(PAY_TABLES).find(t => t.classifier === 'deucesWild')!
    const rows = buildDisplayDistribution({ Nothing: 1 }, dw)
    expect(rows.map(r => r.name)).toEqual([...dw.hands.map(h => h.name), 'Nothing'])
  })
})
