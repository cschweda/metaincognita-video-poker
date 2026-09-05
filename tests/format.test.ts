import { describe, it, expect } from 'vitest'
import { formatDollars, formatSignedDollars, formatHandNet, returnTier } from '../app/utils/format'

describe('dollar formatting', () => {
  it('formats coins × denomination as plain dollars', () => {
    expect(formatDollars(12.5, 0.25)).toBe('3.13')
    expect(formatDollars(100, 0.25)).toBe('25.00')
  })

  it('signs a net amount with a leading + or -', () => {
    expect(formatSignedDollars(5, 0.25)).toBe('+$1.25')
    expect(formatSignedDollars(-5, 0.25)).toBe('-$1.25')
    expect(formatSignedDollars(0, 0.25)).toBe('+$0.00')
  })

  it('shows a hand result as net of the wager, so a push is not a gain', () => {
    // A 1:1 pair at 5 coins returns the 5-coin bet: net zero
    expect(formatHandNet(5, 5, 0.25)).toBe('+$0.00')
    // No win: the whole wager is lost
    expect(formatHandNet(0, 5, 0.25)).toBe('-$1.25')
    // Three of a kind at 3:1 pays 15 coins: net +10 coins
    expect(formatHandNet(15, 5, 0.25)).toBe('+$2.50')
  })

  it('tiers a session return the way the panels color it', () => {
    expect(returnTier(99.5)).toBe('good')
    expect(returnTier(97)).toBe('ok')
    expect(returnTier(90)).toBe('bad')
  })
})
