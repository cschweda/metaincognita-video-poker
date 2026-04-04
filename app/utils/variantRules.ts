export interface VariantRules {
  variant: string
  overview: string
  minPayingHand: string
  deckSize: number
  wildCards: string
  handRankings: string[]
  strategyNotes: string[]
  strategyDifferences: string[]
  strategyComplexity: string
  payTableTip: string
}

export const VARIANT_RULES: Record<string, VariantRules> = {
  'Jacks or Better': {
    variant: 'Jacks or Better',
    overview: 'The foundational video poker game and the best starting point for learning. A standard 52-card deck with no wild cards. The minimum paying hand is a pair of Jacks or better (Jacks, Queens, Kings, or Aces). The "9/6" designation refers to the Full House (9) and Flush (6) payouts per coin — these two numbers are the quickest way to identify a good machine.',
    minPayingHand: 'Pair of Jacks or Better',
    deckSize: 52,
    wildCards: 'None',
    handRankings: [
      'Royal Flush — A-K-Q-J-10 of the same suit (250 coins, or 4000 at max bet)',
      'Straight Flush — Five sequential cards of the same suit (50)',
      'Four of a Kind — Four cards of the same rank (25)',
      'Full House — Three of a kind plus a pair (9 on full-pay)',
      'Flush — Five cards of the same suit (6 on full-pay)',
      'Straight — Five sequential cards of any suit (4)',
      'Three of a Kind — Three cards of the same rank (3)',
      'Two Pair — Two different pairs (2)',
      'Jacks or Better — A pair of J, Q, K, or A (1)'
    ],
    strategyNotes: [
      'Always hold a paying hand (pair of Jacks+) unless you have 4 to a Royal Flush.',
      'A low pair (2s through 10s) beats holding a single high card in most situations.',
      'Never break a Flush or Straight to chase a Royal unless you have 4 to the Royal.',
      'Hold two suited high cards over a single high card.',
      'With nothing, hold suited J-Q, J-K, or Q-K over other combinations.',
      'The full optimal strategy has ~30 ranked entries — memorizing the top 15 covers 99% of hands.'
    ],
    strategyDifferences: [
      'This is the baseline — all other variants are compared against JoB strategy.',
      'Low pair (2s-10s) beats a single high card (A, K, Q, J) in almost every situation. This is the #1 mistake new players make.',
      'Four to a flush beats a low pair. Four to an outside straight beats two unsuited high cards.',
      'Never break a flush or straight unless you have four to a royal flush.',
      'Three to a royal flush beats everything except a made paying hand or four to a straight flush.'
    ],
    strategyComplexity: 'Beginner-friendly. ~30 ranked entries in the full strategy, but a simplified 15-entry "simple strategy" captures 99.46% return (only 0.08% less than perfect). The most learnable variant.',
    payTableTip: 'Look for 9/6 machines — they return 99.54% with optimal play. An 8/5 machine looks almost identical but returns only 97.30%. That 2.24% difference costs about $28/hour at typical play speed.'
  },

  'Bonus Poker': {
    variant: 'Bonus Poker',
    overview: 'A Jacks or Better variant with enhanced payouts for four-of-a-kind hands. Four Aces pays 80 coins (vs. 25 in JoB), and four 2s-4s pays 40. The tradeoff is slightly lower Full House and Flush payouts. This is the most common variant on casino floors after Jacks or Better.',
    minPayingHand: 'Pair of Jacks or Better',
    deckSize: 52,
    wildCards: 'None',
    handRankings: [
      'Royal Flush (250 / 4000 at max bet)',
      'Straight Flush (50)',
      'Four Aces (80)',
      'Four 2s-4s (40)',
      'Four 5s-Ks (25)',
      'Full House (8 on full-pay)',
      'Flush (5 on full-pay)',
      'Straight (4)',
      'Three of a Kind (3)',
      'Two Pair (2)',
      'Jacks or Better (1)'
    ],
    strategyNotes: [
      'Hold Aces more aggressively than in Jacks or Better due to the 80-coin bonus.',
      'A pair of Aces is worth more than in JoB — don\'t break them for a 4-flush.',
      'Low pairs (2s-4s) are slightly more valuable because of the 40-coin four-of-a-kind bonus.',
      'Strategy is very similar to JoB with subtle differences around Ace and low-pair holdings.'
    ],
    strategyDifferences: [
      'vs JoB: Aces are held more aggressively due to the 80-coin Four Aces bonus. In JoB, you might break a pair of Aces for four to a flush — in Bonus Poker, you hold the Aces.',
      'vs JoB: Low pairs (2s-4s) gain slightly more value because Four 2s-4s pays 40 instead of 25.',
      'vs JoB: Two Pair still pays 2:1 (unlike Double Bonus), so the volatility is similar to JoB.',
      'The strategy is 90% identical to JoB — the differences only matter in specific Ace-related and low-pair situations.'
    ],
    strategyComplexity: 'Beginner-friendly. Nearly identical to JoB with a few Ace-specific adjustments. If you know JoB strategy, you can play Bonus Poker with minimal additional study.',
    payTableTip: 'Full-pay Bonus Poker (8/5) returns 99.17%. The enhanced four-of-a-kind bonuses make the game more volatile — bigger swings but a slightly lower base return than 9/6 JoB.'
  },

  'Double Bonus': {
    variant: 'Double Bonus',
    overview: 'Amplifies the four-of-a-kind bonuses dramatically. Four Aces pays 160 coins — a massive premium. The tradeoff: Two Pair pays only 1:1 instead of the usual 2:1. This single change makes the game far more volatile and fundamentally alters the strategy. One of the rare games where optimal play produces a positive expected value (+0.17%).',
    minPayingHand: 'Pair of Jacks or Better',
    deckSize: 52,
    wildCards: 'None',
    handRankings: [
      'Royal Flush (250 / 4000 at max bet)',
      'Straight Flush (50)',
      'Four Aces (160)',
      'Four 2s-4s (80)',
      'Four 5s-Ks (50)',
      'Full House (10 on full-pay)',
      'Flush (7 on full-pay)',
      'Straight (5)',
      'Three of a Kind (3)',
      'Two Pair (1) — reduced from the standard 2',
      'Jacks or Better (1)'
    ],
    strategyNotes: [
      'Two Pair paying only 1:1 changes everything — break two pair more often to chase bigger hands.',
      'Aces are held extremely aggressively. A single Ace is often worth holding over other combinations.',
      'The positive EV (+0.17%) is theoretical — variance is brutal and most sessions end at a loss.',
      'This game rewards perfect play more than any other JoB variant.'
    ],
    strategyDifferences: [
      'vs JoB: TWO PAIR ONLY PAYS 1:1. This is the single biggest strategy change. In JoB, Two Pair pays 2:1 and you always hold both pairs. In Double Bonus, you sometimes break Two Pair to chase a bigger hand.',
      'vs JoB: Aces are held with extreme aggression. A single Ace is often worth holding over other combinations because Four Aces pays 160 coins.',
      'vs JoB/Bonus: Four 2s-4s pays 80 (vs 40 in Bonus, 25 in JoB). Low pairs become more valuable.',
      'vs JoB: Breaking a made straight or flush to chase four to a royal is more common because the royal bonus is a larger fraction of total return.',
      'The reduced Two Pair payout means long losing streaks are common even with perfect play. Emotional discipline matters more here than in any other non-wild variant.'
    ],
    strategyComplexity: 'Intermediate. ~35 ranked entries. The Two Pair change forces you to re-learn several JoB habits. Most JoB players lose money when they switch to Double Bonus without adjusting strategy.',
    payTableTip: 'Full-pay 10/7 Double Bonus returns 100.17% — the player has the edge. But the Two Pair reduction to 1:1 makes losing streaks much harsher. Most players give back the theoretical edge through mistakes.'
  },

  'Double Double Bonus': {
    variant: 'Double Double Bonus',
    overview: 'Adds kicker bonuses on top of the four-of-a-kind bonuses. Four Aces with a 2, 3, or 4 kicker pays 400 coins — nearly as much as a Royal Flush. Extremely popular in Vegas because the big hits are spectacular. The kicker-aware strategy is more complex than any other non-wild variant.',
    minPayingHand: 'Pair of Jacks or Better',
    deckSize: 52,
    wildCards: 'None',
    handRankings: [
      'Royal Flush (250 / 4000 at max bet)',
      'Straight Flush (50)',
      'Four Aces + 2-4 kicker (400)',
      'Four Aces + 5-K kicker (160)',
      'Four 2s-4s + A-4 kicker (160)',
      'Four 2s-4s + 5-K kicker (80)',
      'Four 5s-Ks (50)',
      'Full House (9 on common pay table)',
      'Flush (6)',
      'Straight (4)',
      'Three of a Kind (3)',
      'Two Pair (1)',
      'Jacks or Better (1)'
    ],
    strategyNotes: [
      'Kickers matter — a 2, 3, or 4 alongside three Aces should be held, unlike in other variants.',
      'The 400-coin Four Aces + kicker hand reshapes strategy around preserving potential kicker cards.',
      'Two Pair again pays only 1:1, making the game volatile.',
      'The full strategy is the most complex of any non-wild variant due to kicker considerations.'
    ],
    strategyDifferences: [
      'vs Double Bonus: KICKERS MATTER. When you have three Aces, hold a 2, 3, or 4 alongside them — that kicker turns a 160-coin hand into a 400-coin hand. In every other variant, you discard the kicker.',
      'vs Double Bonus: Three 2s-4s with an Ace or another 2-4 as kicker should also be held — the kicker turns 80 into 160.',
      'vs JoB: Two Pair pays 1:1 (same as Double Bonus). All the Two Pair strategy changes from Double Bonus apply here too.',
      'vs all others: The kicker creates situations where holding 4 cards (trips + kicker) is better than holding 3 (trips alone). This is unique to DDB.',
      'The full strategy has more entries than any other non-wild variant because kicker considerations create many branch points.'
    ],
    strategyComplexity: 'Advanced. ~45 ranked entries — the most complex non-wild variant. The kicker rules add a layer of decision-making that doesn\'t exist in any other game. Not recommended until you\'ve mastered JoB and Double Bonus.',
    payTableTip: 'The common 9/6 DDB pay table returns 98.98% with optimal play. The massive jackpot hands (400 for Four Aces + kicker) create exciting peaks but the Two Pair reduction ensures deep valleys.'
  },

  'Bonus Poker Deluxe': {
    variant: 'Bonus Poker Deluxe',
    overview: 'A streamlined bonus variant where all four-of-a-kind hands pay 80 coins regardless of rank. No differentiation between four Aces and four 5s — they all pay the same. Two Pair pays only 1:1, increasing volatility. This simplicity makes the strategy easier to learn than Bonus Poker or Double Bonus while still offering enhanced four-of-a-kind payouts.',
    minPayingHand: 'Pair of Jacks or Better',
    deckSize: 52,
    wildCards: 'None',
    handRankings: [
      'Royal Flush (250 / 4000 at max bet)',
      'Straight Flush (50)',
      'Four of a Kind (80) — all ranks pay the same',
      'Full House (8 on full-pay)',
      'Flush (6 on full-pay)',
      'Straight (4)',
      'Three of a Kind (3)',
      'Two Pair (1) — reduced from standard 2',
      'Jacks or Better (1)'
    ],
    strategyNotes: [
      'Simpler strategy than Bonus Poker — no need to differentiate four-of-a-kind by rank.',
      'Two Pair paying 1:1 makes the game more volatile than standard JoB.',
      'The uniform 80-coin four-of-a-kind payout means all pairs are equally worth chasing.',
      'Good stepping stone between Jacks or Better and the more complex bonus variants.'
    ],
    strategyDifferences: [
      'vs Bonus Poker: All four-of-a-kinds pay 80 regardless of rank. No need to differentiate between quad Aces and quad 5s — simpler strategy.',
      'vs JoB: Two Pair pays 1:1 (same change as Double Bonus/DDB). Adjust accordingly.',
      'vs Double Bonus: Less aggressive Ace-holding because the Ace bonus is gone — all quads are equal.',
      'The uniform quad payout makes this the simplest bonus variant. If you find the rank-differentiated bonuses confusing, start here.'
    ],
    strategyComplexity: 'Intermediate. Simpler than Bonus Poker despite having bonus payouts, because there\'s no rank differentiation. Good stepping stone between JoB and the more complex bonus variants.',
    payTableTip: 'The 8/6 pay table returns 98.49% with optimal play. The balanced four-of-a-kind payouts and simpler strategy make this a solid choice for intermediate players.'
  },

  'Deuces Wild': {
    variant: 'Deuces Wild',
    overview: 'All four 2s (deuces) are wild cards that can substitute for any card to make the best possible hand. The minimum paying hand is Three of a Kind — pairs and two pair occur too frequently with four wild cards to justify a payout. The strategy is organized around the number of deuces in your initial deal (0, 1, 2, 3, or 4). Rule number one: never discard a deuce.',
    minPayingHand: 'Three of a Kind',
    deckSize: 52,
    wildCards: 'All four 2s (Deuces)',
    handRankings: [
      'Natural Royal Flush — A-K-Q-J-10 with no wild cards (250 / 4000 at max bet)',
      'Four Deuces — all four 2s in one hand (200)',
      'Wild Royal Flush — Royal made with help from deuces (25)',
      'Five of a Kind — e.g., three 7s + two deuces (15)',
      'Straight Flush (9)',
      'Four of a Kind (5)',
      'Full House (3)',
      'Flush (2)',
      'Straight (2)',
      'Three of a Kind (1)'
    ],
    strategyNotes: [
      'NEVER discard a deuce. This is the most important rule.',
      'Strategy depends on how many deuces you are dealt (0, 1, 2, 3, or 4).',
      'With 0 deuces: play similar to JoB but more aggressively toward straights and flushes.',
      'With 1 deuce: hold the deuce plus any paying combination; chase straights and flushes.',
      'With 2 deuces: hold both plus any four-of-a-kind or better; otherwise hold just the two deuces.',
      'With 3 deuces: hold all three plus any natural pair (makes five of a kind); otherwise hold just the three.',
      'With 4 deuces: hold all five cards — Four Deuces pays 200 coins.',
      'Pairs and Two Pair do NOT pay in Deuces Wild — don\'t hold them unless they\'re part of a better draw.'
    ],
    strategyDifferences: [
      'vs ALL other variants: This is a completely different game. The strategy has almost nothing in common with JoB. Do not apply JoB strategy to Deuces Wild.',
      'vs JoB: PAIRS DO NOT PAY. A pair of Kings is worthless. Two Pair is worthless. The minimum paying hand is Three of a Kind.',
      'vs JoB: The strategy is organized by DEUCE COUNT (0, 1, 2, 3, or 4 deuces), not by hand type. Each deuce count has its own ranked strategy list.',
      'vs JoB: NEVER DISCARD A DEUCE. This is rule #1. A deuce is always the most valuable card in your hand.',
      'With 0 deuces: Play more aggressively toward straights and flushes than in JoB, because pairs don\'t pay.',
      'With 1 deuce: The deuce + any pair = Three of a Kind (paying hand). Chase flushes and straights aggressively.',
      'With 2 deuces: Two deuces + any natural pair = Four of a Kind. Otherwise just hold the two deuces.',
      'With 3 deuces: Hold all three + any natural pair (makes Five of a Kind). Otherwise hold just the three.',
      'With 4 deuces: Hold all five cards. Four Deuces pays 200 coins — the second-highest hand.'
    ],
    strategyComplexity: 'Advanced. ~45 entries across 5 sub-strategies (one per deuce count). The #1 mistake: applying JoB thinking to a game where pairs don\'t pay.',
    payTableTip: 'Full-pay Deuces Wild returns 100.76% — the player has a +0.76% edge with optimal play. This is the highest-return common video poker game. However, the positive EV depends on hitting rare big hands (Four Deuces, Natural Royals), so most sessions end at a loss even with perfect play. Note: games with >100% return are not legal in Illinois VGTs but are common in Nevada.'
  }
}
