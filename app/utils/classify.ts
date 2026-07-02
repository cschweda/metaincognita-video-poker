import type { Card } from './cards'
import type { PayTableDef } from './payTables'
import { classifyHand, classifyBonusHand, classifyDDBHand } from './handClassifier'
import { classifyDeucesWild } from './wildClassifier'

/**
 * Classify a 5-card hand using the classifier that matches the pay table's
 * variant. Returns the hand name as it appears in the pay table, or 'Nothing'.
 */
export function classifyForPayTable(cards: Card[], payTable: PayTableDef): string {
  if (payTable.classifier === 'deucesWild') return classifyDeucesWild(cards)
  if (payTable.classifier === 'ddb') return classifyDDBHand(cards)
  if (payTable.classifier === 'bonus') return classifyBonusHand(cards)
  return classifyHand(cards)
}
