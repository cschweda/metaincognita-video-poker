# Doc 03 — Phase 3: Additional Variants & Pay Table Literacy

> **Project:** Video Poker Simulator
> **Phase:** 3 of 5
> **Scope:** Bonus Poker, Double Bonus, DDB, Pay Table Literacy, Machine Scout, Hand Category Trainer
> **Depends on:** Phase 2 (working strategy engine and training panel)
> **Produces:** All four Tier 1 variants playable with full training support; three educational modules

---

## Phase Objective

Expand the simulator from a single-variant trainer to a comprehensive Tier 1 suite. Add three new variants (Bonus Poker, Double Bonus, Double Double Bonus), each with their own pay tables and strategy data. Build three educational modules that teach pay table literacy, pay table scouting, and targeted hand practice.

Because the Phase 2 EV calculator and training panel are variant-agnostic, adding new variants is primarily a data task: new pay table objects, new strategy data files, and (for DDB only) a small classifier extension for kicker awareness.

---

## Deliverables

### 1. Bonus Poker (8/5)

**Pay table object:** New `PayTable` entry with the Bonus Poker payout structure (Four Aces: 80, Four 2s–4s: 40, Four 5s–Ks: 25, otherwise identical to JoB).

**Strategy data:** New ranked strategy list (~35 entries). Key differences from JoB:
- Aces held more aggressively (the 80-coin four-aces payout changes breakpoints)
- Some two-pair hands broken differently
- Three-to-a-royal vs. high pair breakpoints shift

**Hand classifier change:** None. The Bonus Poker four-of-a-kind subcategories (aces, 2s–4s, 5s–Ks) are pay table distinctions, not classifier distinctions. The classifier returns `fourOfAKind` with the rank; the pay table looks up the rank to determine the bonus tier.

Actually — this means the `HandResult` needs to carry rank information for four-of-a-kind hands, not just the category string. Extend `HandResult`:

```typescript
interface HandResult {
  category: string
  label: string
  payout: number
  cards: Card[]
  winningCards?: number[]
  fourOfAKindRank?: Rank    // populated when category is 'fourOfAKind'
}
```

The pay table's payout lookup uses `fourOfAKindRank` when present. This small extension serves Bonus Poker, Double Bonus, AND Double Double Bonus — build it once.

**Setup page:** Bonus Poker appears as a variant option. One pay table (8/5 full-pay, 99.17% return).

### 2. Double Bonus (10/7)

**Pay table object:** New `PayTable` entry with the Double Bonus payout structure (Four Aces: 160, Four 2s–4s: 80, Four 5s–Ks: 50, Two Pair: 1). The Two Pair payout dropping from 2 to 1 is the defining characteristic.

**Strategy data:** New ranked strategy list (~40 entries). Dramatically different from JoB:
- Aces dominate the strategy (the 160-coin payout makes ace-related draws much more attractive)
- Two pair is worth much less (only 1:1), so breaking two pair for a draw to four-of-a-kind is often correct
- Higher volatility changes several breakpoints

**Hand classifier change:** None beyond the `fourOfAKindRank` extension from Bonus Poker.

**Educational note in UI:** This is one of the rare positive-EV games (100.17% return with optimal play). The setup screen should highlight this: "This game has a theoretical player advantage of +0.17%. The casino expects to lose money to perfect players. Very few players achieve this." The convergence viewer (Phase 4) will make this visible.

**Setup page:** Double Bonus appears as a variant option. One pay table (10/7 full-pay, 100.17% return).

### 3. Double Double Bonus (9/6)

**Pay table object:** New `PayTable` entry with the DDB payout structure, including kicker-differentiated four-of-a-kind payouts:
- Four Aces + 2–4 kicker: 400
- Four Aces + 5–K kicker: 160
- Four 2s–4s + A–4 kicker: 160
- Four 2s–4s + 5–K kicker: 80
- Four 5s–Ks: 50

**Kicker-aware classifier extension:**

When the hand classifier detects four-of-a-kind, additionally evaluate the fifth card (the kicker):

```typescript
interface HandResult {
  // ... existing fields ...
  fourOfAKindRank?: Rank
  kickerRank?: Rank         // the fifth card's rank when four-of-a-kind
}
```

The pay table lookup for DDB uses both `fourOfAKindRank` and `kickerRank` to determine the payout tier. This is ~10–15 lines of additional logic in the pay table lookup function, not in the classifier itself — the classifier already identifies four-of-a-kind and can trivially report the kicker.

**Strategy data:** New ranked strategy list (~45 entries). The most complex Tier 1 strategy:
- Kickers matter: holding a low kicker (2–4) with three aces is correct in DDB but wrong in every other variant
- The 400-coin four-aces-with-low-kicker payout creates situations where breaking a made hand (like a flush or straight) to chase four aces is optimal
- Two pair at 1:1 makes the same two-pair-breaking dynamics as Double Bonus

**Setup page:** Double Double Bonus appears as a variant option. One pay table (9/6, 98.98% return).

### 4. Pay Table Literacy Tutorial (`PayTableLiteracy.vue`)

An interactive tutorial accessible from the setup page. Three modules:

**Module 1: The Pay Table Challenge**
- Display two JoB pay tables side by side (e.g., 9/6 vs. 8/5)
- Ask the player to identify which is better and why
- Reveal: the only difference is Full House (9 vs. 8) and Flush (6 vs. 5)
- Show the return difference: 99.54% vs. 97.30% = 2.24%
- Calculate the annual cost: at $1.25/hand and 500 hands/hour, 4 hours/week, 50 weeks/year = $5,600/year from one number on a pay table
- Repeat with 3–4 more pay table pairs of increasing subtlety

**Module 2: The Max Coin Multiplier**
- Show the royal flush payout at 1 coin (250), 2 coins (500), 3 coins (750), 4 coins (1000), 5 coins (4000)
- The 5-coin payout is 800 per coin, not 250 — a 3.2× multiplier
- Calculate: this bonus is worth ~1.5% of total return
- Show: playing 4 coins on a 9/6 machine gives ~98.0% return vs. 99.54% at max coins
- Conclusion: always bet max coins, even if it means playing a lower denomination

**Module 3: Variant Comparison**
- Show pay tables for JoB, Bonus, Double Bonus, DDB side by side
- Highlight the key differences (four-of-a-kind bonuses, two pair reduction)
- Show how the return percentages differ
- Teaching point: the game with the best return isn't always the best game for YOU — variance matters, and DDB's 1:1 two pair makes sessions brutally swingy

### 5. Machine Scout Mode (`MachineScout.vue`)

A timed quiz where the simulator shows pay tables as they'd appear on a casino floor and the player must identify the game variant, the return percentage, and whether it's worth playing.

**Gameplay:**
- A pay table appears on screen (styled to look like a real machine's glass)
- Timer starts (configurable: 10s, 15s, 30s per table)
- Player enters: variant name, approximate return %, and "Play" or "Walk Away"
- Score: points for correct variant identification, points for return % within ±0.5%, points for correct play/walk decision
- Rounds: 10 tables per session, mix of JoB variants, Bonus, Double Bonus, DDB
- Leaderboard: personal best scores (stored in Pinia, persists via localStorage)

**Difficulty levels:**
- **Beginner:** JoB variants only, 30s per table, return % shown after each answer
- **Intermediate:** All Tier 1 variants, 15s per table, return % shown after each answer
- **Expert:** All Tier 1 variants, 10s per table, return % shown only at end of session

This teaches the real-world skill that pays for itself fastest: knowing which machine to sit down at.

### 6. Hand Category Trainer (`HandCategoryTrainer.vue`)

A targeted practice mode that deals specific hand types the player needs to practice.

**Common mistake categories (JoB):**
1. Low pair vs. four to a flush (hold the flush draw — many players hold the pair)
2. High pair vs. four to a flush (hold the pair — opposite of #1, trips up players who learned #1)
3. Three to a royal vs. made straight/flush (break the made hand for the royal draw)
4. Two suited high cards vs. unsuited high cards (hold the suited ones)
5. Inside straight draw vs. high cards (hold the high cards)
6. Suited J-10 vs. single jack (hold both suited)
7. Three to a straight flush vs. low pair
8. Breaking two pair in Double Bonus/DDB (because two pair pays only 1:1)

**Gameplay:**
- Player selects a category or "random mix"
- Simulator deals hands that contain the relevant decision point
- Player makes their hold, gets immediate feedback (EV comparison)
- Track accuracy per category over time
- "Mastered" flag when a category hits 90%+ accuracy over 20+ hands

**Hand generation:** The trainer doesn't just deal random hands — it constructs hands that present the target decision. For "low pair vs. four to a flush," it deals a hand with a low pair where three of the five cards share a suit with a fourth card (creating a four-to-flush draw that competes with the pair). This is a constrained deal: pick cards that create the scenario, then fill remaining positions randomly from the remaining deck.

---

## Setup Page Updates

The setup page now includes:
- **Variant selector:** Jacks or Better, Bonus Poker, Double Bonus, Double Double Bonus
- **Pay table selector:** per-variant pay tables with return percentages
- **Training modules:** links to Pay Table Literacy, Machine Scout, Hand Category Trainer
- **Mode selector:** "Play" (standard game), "Train" (training panel visible), "Test" (hidden optimal play)

---

## Accessibility Additions (Phase 3)

- [ ] Machine Scout timer is not purely visual (audio or vibration option, countdown announced to screen readers)
- [ ] Pay Table Literacy side-by-side comparison readable by screen readers (table comparison pattern, not visual-only)
- [ ] Hand Category Trainer category selection keyboard-accessible
- [ ] All new components meet contrast requirements
- [ ] axe-core: zero violations

---

## Testing Checklist (Phase 3)

- [ ] Bonus Poker: pay table payouts match published values
- [ ] Bonus Poker: strategy parity — brute force top pick matches strategy lookup for test suite
- [ ] Double Bonus: pay table payouts match published values
- [ ] Double Bonus: strategy parity test
- [ ] Double Bonus: two pair pays 1 (not 2)
- [ ] DDB: kicker detection correct for all four-of-a-kind + kicker combinations
- [ ] DDB: Four Aces + 3 kicker = 400 coins, Four Aces + 5 kicker = 160 coins
- [ ] DDB: strategy parity test
- [ ] Pay Table Literacy: annual cost calculation correct
- [ ] Machine Scout: scoring correct for all answer combinations
- [ ] Hand Category Trainer: constructed hands always contain the target decision point
- [ ] All four variants selectable from setup page
- [ ] No regressions in Phase 1/2 functionality
- [ ] Variant switching mid-session resets state correctly

---

## What Phase 3 Does NOT Include

- Bots (Phase 4)
- Statistical validation (Phase 4)
- Convergence viewer (Phase 4)
- Wild card variants (Phase 5)
