# Doc 02 — Phase 2: Strategy Engine & Training

> **Project:** Video Poker Simulator
> **Phase:** 2 of 5
> **Scope:** EV calculator, optimal play, mistake tracking, hand history, strategy reference
> **Depends on:** Phase 1 (working JoB machine)
> **Produces:** A training tool — the machine now teaches

---

## Phase Objective

Transform the Phase 1 machine from a game into a training tool. After Phase 2, every hand the player deals comes with complete mathematical analysis: what the optimal play is, what the player chose, how much the deviation costs, and a running tally of the cumulative price of mistakes. The player can review every hand from the session and see exactly where their money went.

This is the phase where the simulator's core value proposition comes alive.

---

## Deliverables

### 1. Brute-Force EV Calculator (`useEVCalculator.ts`)

For every dealt hand, compute the expected value of all 32 possible hold patterns (2^5 = 32 combinations of holding/discarding 5 cards).

**Algorithm:**

For each of the 32 hold patterns:
1. Identify the held cards and the number of cards to draw (0–5)
2. Enumerate all possible draw outcomes: C(47, drawCount) combinations
   - Hold 5, draw 0: 1 outcome (the hand as dealt)
   - Hold 4, draw 1: 47 outcomes
   - Hold 3, draw 2: C(47,2) = 1,081 outcomes
   - Hold 2, draw 3: C(47,3) = 16,215 outcomes
   - Hold 1, draw 4: C(47,4) = 178,365 outcomes
   - Hold 0, draw 5: C(47,5) = 1,533,939 outcomes
3. For each outcome, classify the resulting 5-card hand using the Phase 1 hand classifier
4. Look up the payout in the active pay table
5. Average all payouts to get the expected value for this hold pattern

**Total evaluations per hand:** Sum of all draw counts across 32 patterns ≈ 2.6M hand classifications. Each classification is O(1) (rank/suit counting). Modern browsers handle this in ~50–200ms.

**If performance is a concern:** The hold-0 pattern alone accounts for 1.5M evaluations. This pattern (discard all 5 cards) is rarely optimal and can be computed last, with early termination if its partial EV is already below the current best. In practice, the full computation should be fast enough without optimization.

**Interface:**

```typescript
interface HoldAnalysis {
  heldIndices: number[]                    // which cards held (0-4)
  heldCards: Card[]
  expectedValue: number                    // EV per coin wagered
  handDistribution: Record<string, number> // probability of each resulting hand type
}

// Returns all 32 options, sorted by EV descending.
// [0] is the optimal play.
function analyzeAllHolds(
  dealt: Card[],
  payTable: PayTable,
  remainingDeck: Card[]
): HoldAnalysis[]
```

The `handDistribution` uses `Record<string, number>` keyed by the hand classifier's category strings. This is variant-agnostic: JoB has 10 keys, DDB will have 14 (kicker-differentiated), Deuces Wild will have 12+. The EV calculator doesn't know which variant is active — it just asks the classifier and the pay table.

### 2. Strategy Lookup Table (`useStrategy.ts`)

A ranked list of hand patterns for Jacks or Better, matching the Wizard of Odds published optimal strategy. The full list has ~30+ entries (the abbreviated 21-entry list in Doc 00 omits some edge cases around suited/unsuited high card combinations and straight flush draw subtleties).

**Strategy data structure:**

```typescript
interface StrategyEntry {
  rank: number              // priority (1 = highest)
  pattern: string           // human-readable description
  matchFn: (hand: Card[]) => number[] | null  // returns held indices or null if no match
}
```

The player's hand is evaluated against the strategy list top-to-bottom. The first match determines the optimal hold. The strategy lookup provides instant guidance; the brute-force EV calculator provides verification and exact numbers.

**Parity requirement:** For every possible 5-card hand, the strategy lookup must recommend the same hold as the brute-force calculator's top-ranked option. Any discrepancy is a bug in the strategy data. The `strategy-parity.test.ts` test in Phase 4 validates this exhaustively.

### 3. Optimal Play Indicator (in `TrainingPanel.vue`)

Two modes:

**Training mode (default):** After the player commits their holds and clicks Draw, the training panel reveals the optimal hold alongside the player's hold. If they match, a green checkmark. If they differ, the panel shows:
- The optimal hold (which cards)
- The EV of the optimal play
- The EV of the player's play
- The cost of the mistake (difference × bet in dollars)

**Test-yourself mode:** The optimal play is never revealed during the hand. Instead, a post-draw summary shows whether the hold was optimal, and the running stats track accuracy. For players who want to test their knowledge without a safety net.

**Hint mode (optional toggle):** Before the player commits, the training panel shows how many cards should be held (but not which ones). "Optimal play holds 2 cards." A gentle nudge without giving the answer.

### 4. Mistake Detection & Cost Tracking

Every hand where the player's hold differs from the optimal hold is a mistake. The cost of the mistake is:

```
mistakeCost = (optimalEV - playerEV) × coinsBet × denomination
```

Example: Optimal EV is 1.218 coins per coin bet, player's EV is 0.824, bet is 5 coins at $0.25 denomination.
Cost = (1.218 - 0.824) × 5 × 0.25 = $0.49

This is tracked per hand and accumulated per session.

**Session stats (extended from Phase 1):**

```typescript
interface SessionStats {
  handsPlayed: number
  handsWon: number
  mistakeCount: number
  totalMistakeCostCredits: number     // cumulative EV lost in credits
  totalMistakeCostDollars: number     // cumulative EV lost in dollars
  effectiveReturn: number             // actual return % achieved
  optimalReturn: number               // theoretical return % for this pay table
  returnGap: number                   // difference (the "skill gap")
}
```

### 5. Hand History Log (`useHandHistory.ts`, `HandHistory.vue`)

A scrollable, reviewable record of every hand played in the session.

**Each entry stores:**

```typescript
interface HandHistoryEntry {
  handNumber: number
  dealtCards: Card[]
  playerHeld: number[]             // indices the player held
  optimalHeld: number[]            // indices the optimal strategy holds
  drawnCards: Card[]               // the final 5-card hand after draw
  resultCategory: string           // e.g. 'fullHouse'
  resultLabel: string              // e.g. 'Full House'
  payout: number                   // credits won
  playerEV: number                 // EV of the player's hold
  optimalEV: number                // EV of the optimal hold
  mistakeCost: number              // 0 if optimal, else the dollar cost
  coinsBet: number
  denomination: number
  timestamp: number
}
```

**UI:**
- Collapsed view: hand number, result, payout, mistake indicator (green check or red cost)
- Expanded view: the dealt hand visualized, player's holds highlighted, optimal holds shown, full 32-option EV breakdown for that hand
- Filter: "Show mistakes only" toggle to focus on learning opportunities
- Export: JSON download of session history (for future comparison mode, v2+)

### 6. Strategy Reference Panel

A collapsible panel (sidebar or modal) showing the ranked strategy list for the active variant. The player can reference it during play without switching screens.

- Numbered list matching the strategy data
- Current hand's matching strategy entry highlighted
- Brief explanation for each entry ("Hold the low pair over the single high card because the pair's draw has more winning outcomes")

### 7. Max Coin Warning System

If the player bets fewer than 5 coins:
- A persistent warning bar appears: "Playing less than max coins reduces your return from 99.54% to ~98.0%. The royal flush bonus is worth ~1.5% of total return."
- The warning includes a "Bet Max" button for quick correction
- First time only: a brief explainer modal about why max coins matter (the disproportionate royal flush payout at 5 coins)
- The warning can be dismissed but reappears each session

---

## Accessibility Additions (Phase 2)

- [ ] Training panel EV data has structured ARIA labels
- [ ] Mistake cost announcement in `aria-live` region
- [ ] Hand history entries are keyboard-navigable
- [ ] Strategy reference panel accessible via keyboard shortcut
- [ ] Max coin warning uses `role="alert"`
- [ ] All new interactive elements in tab order
- [ ] axe-core: zero violations (re-validate after Phase 2 additions)

---

## Testing Checklist (Phase 2)

- [ ] EV calculator: for a known hand (e.g., JoB 9/6, dealt Jh-Jd-7c-8s-2h), verify the top-ranked hold matches published strategy (hold the jacks)
- [ ] EV calculator: all 32 options sum of hand distribution probabilities = 1.0 for each hold pattern
- [ ] EV calculator: hold-5 (keep all cards) EV matches the pay table payout for the dealt hand
- [ ] Strategy lookup: first match on a test suite of 50+ hands matches brute-force calculator's top pick
- [ ] Mistake detection: optimal play = no cost, suboptimal play = correct cost calculation
- [ ] Session stats: effective return % converges toward theoretical over many hands with optimal play
- [ ] Hand history: entry count matches hands played
- [ ] Hand history: expanded view shows correct EV breakdown
- [ ] Max coin warning: appears at <5 coins, disappears at 5 coins
- [ ] No regressions in Phase 1 functionality

---

## Performance Targets

- EV calculation for all 32 hold patterns: < 500ms on modern hardware
- If > 500ms, implement Web Worker offloading (compute in background thread, show spinner)
- UI remains responsive during calculation (no main thread blocking)
- Hand history: smooth scrolling up to 500+ entries

---

## What Phase 2 Does NOT Include

- Additional variants beyond JoB (Phase 3)
- Pay Table Literacy tutorial (Phase 3)
- Machine Scout mode (Phase 3)
- Hand Category Trainer (Phase 3)
- Bots (Phase 4)
- Statistical validation (Phase 4)
- Convergence viewer (Phase 4)
- Wild card variants (Phase 5)
