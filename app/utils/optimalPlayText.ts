import type { HoldAnalysis } from './evCalculator'
import { describeHold, describeEvGap } from './holdDescription'

/**
 * Teaching copy for the optimal play, shared by the dealt-phase headline
 * and the result-phase recap (previously duplicated computeds).
 */

/** Human-readable optimal play description like "Hold the pair of Sevens". */
export function optimalHoldDescription(optimal: HoldAnalysis | null, isDeucesWild: boolean): string {
  if (!optimal) return ''
  return describeHold(optimal.heldCards, isDeucesWild)
}

/** Brief explanation of WHY the optimal play is best. */
export function optimalHoldReason(optimal: HoldAnalysis | null, allOptions: HoldAnalysis[]): string {
  if (!optimal) return ''

  const dist = optimal.handDistribution
  // Get paying hands sorted by probability (exclude Nothing)
  const payingHands = Object.entries(dist)
    .filter(([name]) => name !== 'Nothing')
    .sort((a, b) => b[1] - a[1])

  const totalWinPct = payingHands.reduce((sum, [, p]) => sum + p, 0) * 100

  if (payingHands.length === 0) {
    return 'No realistic winning draws — minimize losses.'
  }

  // Check if it's a pat hand (hold all 5)
  if (optimal.heldIndices.length === 5) {
    return 'Already a made hand — any draw risks losing it.'
  }

  // Find the top paying outcomes
  const top = payingHands.slice(0, 3)
  const parts: string[] = []

  for (const [name, prob] of top) {
    const pct = (prob * 100).toFixed(1)
    parts.push(`${pct}% chance of ${name}`)
  }

  let reason = parts.join(', ')

  // Add overall win probability
  if (totalWinPct > 0) {
    reason += `. Total win probability: ${totalWinPct.toFixed(1)}%.`
  }

  // Compare to second-best option
  if (allOptions.length >= 2) {
    const secondBest = allOptions[1]!
    reason += ` ${describeEvGap(optimal.expectedValue, secondBest.expectedValue)}`
  }

  return reason
}
