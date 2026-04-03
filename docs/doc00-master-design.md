# Doc 00 — Video Poker Simulator: Master Design

> **Document suite:** `doc00` through `doc12` (13 documents)
> **Project:** Video Poker Simulator
> **Stack:** Nuxt 4.4+ · Nuxt UI v4+ · Pinia · Yarn 1.22.22 · Netlify · TypeScript
> **Status:** Pre-build (design complete)

---

## Vision

A browser-based video poker training tool that teaches players to identify profitable machines by reading pay tables, make mathematically optimal hold/discard decisions on every hand, and understand exactly how much their mistakes cost them — in real time, hand by hand, with a running tally of money left on the table.

This is not a casino game. It's a casino education tool that happens to look and feel like playing video poker.

---

## Why This Game Matters

Video poker is the only machine game in a casino where a skilled player can reduce the house edge below 0.5% — and in one common variant (full-pay Deuces Wild), achieve a positive expected value of +0.76%. The game is mathematically transparent: the pay table on the screen contains all the information needed to calculate the exact return percentage. The strategy is completely solvable: for every possible 5-card hand dealt against every possible pay table, there is one objectively correct hold/discard decision.

Despite this, most players lose 3–5% because they make suboptimal holds, play unfavorable pay tables without realizing it, and don't bet max coins (missing the royal flush bonus). The gap between informed play and uninformed play is worth $20–40/hour — larger than any other machine game in the casino.

The simulator closes that gap.

---

## Document Suite Index

| Doc | Title | Purpose |
|-----|-------|---------|
| 00 | Master Design | This document — vision, architecture, variants, full scope |
| 01 | Phase 1: Machine & Core Engine | JoB baseline: UI, deck, deal/draw, hand classifier, credits |
| 02 | Phase 2: Strategy Engine & Training | EV calculator, optimal play, mistakes, hand history |
| 03 | Phase 3: Variants & Pay Table Literacy | Bonus/Double Bonus/DDB, Machine Scout, Hand Category Trainer |
| 04 | Phase 4: Bots & Statistical Validation | Bot personas, convergence viewer, validation suite |
| 05 | Phase 5: Wild Card Engine & Wild Variants | Wild classifier, Deuces Wild, Joker Poker |
| 06 | Security | RNG integrity, CSP, client-side threat model |
| 07 | LLM Build Prompt | Self-contained prompt for Claude to build each phase |
| 08 | Differentiation | What makes this different from existing VP trainers |
| 09 | Monorepo & Deployment | Standalone project structure, simulator collection relationship |
| 10 | Revision & Gap Analysis | Changes from original design, open questions |
| 11 | Architecture Decisions | ADRs for key technical choices |
| 12 | Use Cases | User stories, edge cases, error states |

---

## Core Game Variants

The simulator ships with four Tier 1 variants (no wild cards) and two Tier 2 variants (wild cards), each with configurable pay tables:

### Jacks or Better (Primary)

The foundational game. A pair of jacks or better is the minimum paying hand. No wild cards.

**Full-pay (9/6) pay table — 99.54% return with optimal play:**

| Hand | Coins (per 1 coin bet) |
|------|----------------------|
| Royal Flush | 250 (800 with max 5 coins) |
| Straight Flush | 50 |
| Four of a Kind | 25 |
| Full House | 9 |
| Flush | 6 |
| Straight | 4 |
| Three of a Kind | 3 |
| Two Pair | 2 |
| Jacks or Better | 1 |

The "9/6" designation comes from the Full House (9) and Flush (6) payouts. Common inferior variants: 8/6 (98.39%), 8/5 (97.30%), 7/5 (96.15%), 6/5 (95.00%). The simulator supports all of these as configurable pay tables, and the setup screen displays the theoretical return for each — teaching pay table literacy before a single hand is dealt.

### Bonus Poker

A Jacks or Better variant with enhanced payouts for specific four-of-a-kind hands. Same 52-card deck, same hand rankings, same basic deal/draw cycle — the only difference is the pay table numbers. Bonus Poker is everywhere on casino floors and is often the first variant players encounter after Jacks or Better.

**Full-pay (8/5) pay table — 99.17% return with optimal play:**

| Hand | Coins |
|------|-------|
| Royal Flush | 250 (800 with max coins) |
| Straight Flush | 50 |
| Four Aces | 80 |
| Four 2s–4s | 40 |
| Four 5s–Ks | 25 |
| Full House | 8 |
| Flush | 5 |
| Straight | 4 |
| Three of a Kind | 3 |
| Two Pair | 2 |
| Jacks or Better | 1 |

The optimal strategy differs from Jacks or Better in subtle but important ways — aces are held more aggressively, and some two-pair hands are broken differently because the four-of-a-kind bonuses change the EV calculation. These strategy differences emerge automatically from the brute-force EV calculator when given the Bonus Poker pay table. No custom strategy code needed.

### Double Bonus (10/7)

Amplifies the four-of-a-kind bonuses further. Four aces pays 160 coins — a massive premium that reshapes the entire strategy around ace-heavy hands.

**Full-pay (10/7) pay table — 100.17% return with optimal play:**

| Hand | Coins |
|------|-------|
| Royal Flush | 250 (800 with max coins) |
| Straight Flush | 50 |
| Four Aces | 160 |
| Four 2s–4s | 80 |
| Four 5s–Ks | 50 |
| Full House | 10 |
| Flush | 7 |
| Straight | 5 |
| Three of a Kind | 3 |
| Two Pair | 1 |
| Jacks or Better | 1 |

This is one of the rare games where the casino is mathematically at a disadvantage with optimal play — the theoretical return of 100.17% means the player has a +0.17% edge. Note that two pair pays only 1:1 — a dramatic reduction from the standard 2:1. This single change makes the game feel much more volatile and fundamentally alters the strategy. Most players can't adjust and give back the theoretical edge through mistakes. The simulator makes this tradeoff visible: a game that's theoretically beatable but practically brutal for imperfect players.

### Double Double Bonus (9/6)

Adds kicker bonuses on top of the four-of-a-kind bonuses. Four aces with a 2, 3, or 4 kicker pays 400 coins — nearly as much as a royal flush. Extremely popular in Vegas because the big hits are spectacular.

**Common (9/6) pay table — 98.98% return with optimal play:**

| Hand | Coins |
|------|-------|
| Royal Flush | 250 (800 with max coins) |
| Straight Flush | 50 |
| Four Aces + 2–4 kicker | 400 |
| Four Aces + 5–K kicker | 160 |
| Four 2s–4s + A–4 kicker | 160 |
| Four 2s–4s + 5–K kicker | 80 |
| Four 5s–Ks | 50 |
| Full House | 9 |
| Flush | 6 |
| Straight | 4 |
| Three of a Kind | 3 |
| Two Pair | 1 |
| Jacks or Better | 1 |

The kicker-aware payouts require a small addition to the hand classifier: when four-of-a-kind is detected, also evaluate the fifth card (the kicker) to determine which bonus tier applies. This is approximately 10–15 lines of additional classifier logic. The strategy diverges significantly from all previous variants — players must hold kickers in situations where Jacks or Better strategy would discard them.

---

## Tier 2 Variants — Wild Card Games

These variants require a wild-card-aware hand classifier. This is the main engineering task for Tier 2: the classifier must count wild cards, remove them from the hand, classify the remaining natural cards, and determine the best possible hand by assigning wilds optimally. Once built, the wild classifier works for all wild card variants.

Wild card games introduce hand types that don't exist in standard poker: five of a kind (e.g., 2-2-2-7-7 in Deuces Wild = five 7s), wild royal flush (a royal made with wild card help, paid less than a natural royal), and four deuces (a special hand in Deuces Wild ranked just below natural royal). The hand hierarchy is deeper — 12–13 hand types instead of 9–10.

### Wild Card EV Calculator: Optimal Assignment Problem

The brute-force EV calculator for wild card games faces a deeper computational challenge than a simple parameter change. For each draw outcome, the wild-card-aware classifier must determine the *optimal assignment* of each wild card — the assignment that produces the highest-paying hand under the active pay table.

For **1 wild card**, this is manageable: try all possible card values (13 ranks × 4 suits = 52 possibilities, minus cards already in hand), keep the best result. In practice, the search space is smaller because you only need to check assignments that could improve the hand category (e.g., completing a flush, making a straight, adding to a pair).

For **2–3 wild cards**, the naive approach of trying all assignment combinations is O(52^w) which gets expensive. The practical solution: classify the *natural* cards first (the non-wild portion of the hand), then determine what the wilds can upgrade it to by checking hand types top-down. Can the wilds complete a royal? A straight flush? Four of a kind? This top-down check is fast because you're testing a fixed hierarchy of ~12 hand types, not enumerating all possible assignments.

For **4 deuces**, the hand is always "four deuces" — a fixed hand type with its own pay table entry. No assignment needed.

The key insight: the wild classifier evaluates *hand types*, not *card assignments*. It asks "given 2 natural cards and 3 wilds, what's the best hand type achievable?" rather than "what's the best specific 5-card hand?" This keeps the computation fast enough for real-time 32-option analysis even with wild cards.

### Deuces Wild

All four 2s are wild cards that substitute for any card. The minimum paying hand is three of a kind (pairs occur too frequently with four wilds to be worth paying). The strategy is organized around the number of deuces in the initial deal (0, 1, 2, 3, or 4 deuces — each has its own ranked strategy list). You never discard a deuce.

**Full-pay pay table — 100.76% return with optimal play:**

| Hand | Coins |
|------|-------|
| Natural Royal Flush | 250 (800 with max coins) |
| Four Deuces | 200 |
| Wild Royal Flush | 25 |
| Five of a Kind | 15 |
| Straight Flush | 9 |
| Four of a Kind | 5 |
| Full House | 3 |
| Flush | 2 |
| Straight | 2 |
| Three of a Kind | 1 |

This is the variant where optimal play produces a positive expected value (+0.76%). The simulator should make this fact prominent — and then show the player, over hundreds of hands, how difficult it is to actually achieve that theoretical return. The variance is high (the positive EV depends heavily on hitting the rare big hands like four deuces and natural royals), and most sessions end at a loss even with perfect play.

### Joker Poker (Kings or Better)

A 53-card deck with one joker added as wild. The minimum paying hand is a pair of kings (because the single wild card makes lower pairs too common). Five of a kind and wild royal flush exist as hand types, same as Deuces Wild, but they're much rarer with only one wild card.

**Full-pay pay table — 100.64% return with optimal play:**

| Hand | Coins |
|------|-------|
| Natural Royal Flush | 250 (800 with max coins) |
| Five of a Kind | 200 |
| Wild Royal Flush | 100 |
| Straight Flush | 50 |
| Four of a Kind | 20 |
| Full House | 7 |
| Flush | 5 |
| Straight | 3 |
| Three of a Kind | 2 |
| Two Pair | 1 |
| Kings or Better | 1 |

The 53-card deck changes the combinatorics slightly — C(48,3) instead of C(47,3) for a 2-card hold — but this is a parameter change in the EV calculator, not a structural one. Another positive-EV game at full-pay.

---

## Variant Architecture Summary

| Variant | Deck | Wild Cards | Engine Work | Full-Pay Return |
|---------|------|-----------|-------------|-----------------|
| Jacks or Better | 52 | None | Baseline | 99.54% |
| Bonus Poker | 52 | None | Pay table only | 99.17% |
| Double Bonus | 52 | None | Pay table only | 100.17% |
| Double Double Bonus | 52 | None | Pay table + kicker check | 98.98% |
| Deuces Wild | 52 | Four 2s | Wild classifier | 100.76% |
| Joker Poker | 53 | One Joker | Wild classifier + 53-card deck | 100.64% |

**Modular design:** The pay table and hand classifier are the swappable modules. Everything upstream (deck, deal, draw) and downstream (EV calculator, training panel, mistake tracker, bot system, session statistics) is variant-agnostic. Build once, works for all six games. The brute-force EV calculator evaluates all 32 hold options against whatever pay table and hand classifier it's given — it doesn't know or care which variant is active.

**Strategy tables:** Each variant has its own optimal strategy lookup table (a ranked list of ~30–45 hand types). These can be pre-computed from the brute-force calculator and verified against the Wizard of Odds published strategies. The strategy tables are static data files, not code — adding a new variant means adding a pay table object and a strategy data file, not writing new logic.

**Variant-agnostic interfaces:** The `HoldAnalysis` type uses `Record<string, number>` for hand distributions rather than a fixed object shape, so the same interface works for JoB's 10 hand types, DDB's kicker-differentiated types, and Deuces Wild's 12+ types. See Doc 11 (Architecture Decisions) for the full ADR.

---

## Build Phases

### Phase 1 — Machine & Core Engine (Doc 01)

Render the video poker machine UI (pay table display, 5-card hand with hold toggles, deal/draw controls, credit system). Implement deck, shuffle, deal, hold/discard, draw cycle. Hand classifier for standard 9-category poker hands. Pay table system with configurable pay table objects. Credit management with configurable denomination. Basic deal/draw animations. Setup page with Jacks or Better pay table selector (9/6, 8/6, 8/5, 7/5, 6/5). Theoretical return display. Accessibility baseline (ARIA states on hold toggles, keyboard navigation, screen reader card announcements, semantic pay table markup).

### Phase 2 — Strategy Engine & Training (Doc 02)

The brute-force 32-option EV calculator with variant-agnostic `HoldAnalysis` interface. Strategy lookup table for Jacks or Better (the full ~30-entry list, verified against Wizard of Odds published strategy). Optimal play indicator (shows correct holds after player commits). Mistake detection and per-hand cost calculation. Session mistake tracker with running EV-lost total. Strategy reference panel viewable during play. Max coin warning system. Hand history log — a scrollable, reviewable record of every hand played in the session with the player's holds, optimal holds, and cost of any mistake.

### Phase 3 — Additional Tier 1 Variants & Pay Table Literacy (Doc 03)

Add Bonus Poker, Double Bonus, Double Double Bonus pay tables and strategy data. Kicker evaluation for Double Double Bonus. Pay Table Literacy tutorial module (side-by-side comparison, annual cost calculator, max coin multiplier explainer). Machine Scout training mode (identify return percentages from pay tables under time pressure — timed, scored, gamified). Hand Category Trainer for targeted practice on common mistake hands.

### Phase 4 — Bots, Validation & Convergence Viewer (Doc 04)

Four bot personas (Perfect Pat, Gut-Feel Gary, Almost-Alice, Superstitious Sam) computed retroactively — bots replay the player's dealt hands with their own strategy at session end, not in real-time parallel. Session comparison dashboard with overlaid bankroll charts. Statistical validation suite: hand frequency validation, return percentage convergence for all four Tier 1 variants, optimal play verification (brute force matches strategy table), pay table return calculation against published reference values. Convergence viewer — a user-facing auto-play mode that runs thousands of hands at speed and visualizes the return percentage wobbling and settling toward the theoretical value. This reuses the validation harness with a chart UI on top.

### Phase 5 — Wild Card Engine & Wild Variants (Doc 05)

Wild-card-aware hand classifier using top-down hand-type evaluation (not brute-force card assignment). Handles five-of-a-kind, wild royal flush, four deuces as distinct hand types. Extended hand hierarchy (12–13 types). Deuces Wild pay table and strategy data (five sub-strategies organized by deuce count: 0, 1, 2, 3, 4). Joker Poker pay table, strategy data, and 53-card deck support. Statistical validation for both wild variants. Bot personas updated with wild-card-aware strategy comparison.

### Future Tiers (v2+)

**Multi-hand modes** (3/5/10/50/100-hand) — Same hold decision, draw runs N times independently. Major UI work to display many simultaneous hands. Teaches variance amplification.

**Ultimate X** — Multiplier state between hands. Two-dimensional strategy (what to hold AND how much to bet). Genuinely novel strategic depth.

**Progressive jackpot modeling** — At what jackpot level does a specific machine become +EV? Breakeven analysis tool.

**Custom pay table builder** — Player enters any pay table, simulator computes the theoretical return and generates an optimal strategy automatically from the brute-force calculator. The ultimate tool for scouting real casino machines.

**Comparison mode** — Play the same dealt hands on two different pay tables simultaneously. See how the same hand, the same hold decision, produces different results on a 9/6 machine vs. an 8/5 machine. The pay table difference made visible hand by hand.

**Penalty card analysis** — Show when a discard affects the EV of remaining draws (relevant for advanced players optimizing the last fraction of a percent).

**Exportable session history** — Download session data to see how pay table differences affect results over time.

---

## Architecture

### Tech Stack

Same as the No-Limit Hold'em and craps simulators:

- **Nuxt 4.4+** with `ssr: false` (client-side SPA)
- **Nuxt UI v4+** for UI components
- **Pinia** for state management (single store)
- **Yarn 1.22.22** package manager (see Doc 11, ADR-01 for rationale)
- **Netlify** static deployment
- **TypeScript** throughout

### Application Structure

Two routes:

- `/` — Setup page (variant selection, pay table configuration, training mode toggles)
- `/game` — The video poker machine

### Shared Infrastructure

The card evaluation engine can be adapted from the No-Limit Hold'em simulator's hand evaluator. Video poker hand ranking is simpler than Hold'em (no community cards, no multi-player comparison — just classify a 5-card hand into one of 9–10 categories). The deck, shuffle, and draw mechanics are standard.

---

## The Machine (Visual Design)

The simulator renders a realistic video poker machine interface — not a table game, not a web form. A machine. The player should feel like they're sitting at a cabinet in a casino.

**Screen layout (top to bottom):**

1. **Pay table display** — The full pay table, always visible, with the current winning hand highlighted after each deal. The pay table numbers for the selected coin level are shown. The theoretical return percentage is displayed in a subtle indicator — something a real machine would never show you, but that this training tool makes visible.

2. **Card area** — Five cards dealt face up. Each card has a HOLD/CANCEL toggle (click or tap). Selected holds are visually indicated (card raised, highlighted border, "HELD" label). Cards not held are visually dimmed. Full keyboard navigation: arrow keys move between cards, Space/Enter toggles hold. Screen reader announces each card's rank, suit, and hold state.

3. **Result area** — After the draw, the winning hand name and payout displayed prominently. Losing hands show "No Win" without drama.

4. **Controls** — Bet One, Bet Max, Deal/Draw button. Credit display. Speed controls for training mode (instant deal vs. animated).

5. **Training panel (right side or bottom, collapsible)** — This is where the simulator becomes an education tool rather than a game.

### The Training Panel

This is the core differentiator. After every deal (before the player makes their hold decisions), the training panel can optionally display:

**Optimal play indicator** — Shows which cards the optimal strategy says to hold, with the expected value of that play. Hidden by default in "test yourself" mode; revealed after the player commits to their holds in "training" mode.

**All 32 options ranked** — Every possible hold/discard combination with its exact expected value, ranked from best to worst. The player can see not just what the best play is, but how much better it is than the alternatives. This answers "why is holding the low pair better than holding the ace kicker?" with a concrete number.

**Mistake cost** — When the player's hold differs from optimal, the panel shows the EV difference. "Your play: hold the pair (EV: 0.824). Optimal play: hold four to the flush (EV: 1.218). Cost of this mistake: $0.49 on a $1.25 bet." This is specific, immediate, and actionable.

**Session mistake tracker** — A running total: "Hands played: 147. Suboptimal holds: 12. Total EV lost to mistakes: $7.30. Your effective return: 98.2% (optimal: 99.54%)." This number is the most important thing on the screen. It turns an abstract concept (house edge) into a concrete dollar amount that the player is personally responsible for.

**Hand history** — A scrollable log of every hand in the session. Each entry shows the dealt hand, the player's holds, the optimal holds, the draw result, and the cost of any mistake. Tapping an entry expands it to show the full 32-option EV breakdown for that hand. This turns session stats from a summary into a learning journal — "here's hand #47 where you held the ace kicker instead of the low pair, and it cost you $0.38."

**Hand category trainer** — A mode where the simulator specifically deals hands that test common mistake points: pair vs. four-to-flush, three-to-royal vs. made hand, inside straight draw vs. high cards. Targeted practice on the decisions players get wrong most often.

---

## Strategy Engine

### The Optimal Play Calculator

For every dealt hand, the engine computes the expected value of all 32 possible hold patterns by evaluating every possible draw outcome. For a hand where you hold 2 cards and draw 3, there are C(47,3) = 16,215 possible draws. The engine evaluates each one against the pay table and averages the results.

This is computationally feasible in real time — 32 hold patterns × ~16K draws each = ~500K evaluations per hand. Each evaluation is a hand classification (constant time lookup). Modern browsers handle this in milliseconds.

```typescript
// Variant-agnostic: handDistribution keys come from the active
// pay table's hand type enum, not a hardcoded object shape.
// JoB has 10 types, DDB has 14 (kicker-differentiated),
// Deuces Wild has 12+. All work with this interface.
interface HoldAnalysis {
  heldIndices: number[]                    // which cards held (0-4)
  heldCards: Card[]
  expectedValue: number                    // EV per coin wagered
  handDistribution: Record<string, number> // probability of each outcome
}

function analyzeHand(
  dealt: Card[],
  payTable: PayTable,
  remainingDeck: Card[]       // 47 cards (52-card deck) or 48 (53-card deck)
): HoldAnalysis[]             // all 32 options, sorted by EV desc
```

### Strategy Lookup Table

In addition to the brute-force calculator, the engine includes a ranked strategy list for each variant (the same lists published by the Wizard of Odds and Bob Dancer). This provides instant "what should I do" guidance without waiting for the full 32-option computation:

**Jacks or Better optimal strategy (abbreviated — full list has ~30+ entries; see reference data for complete version):**

1. Royal Flush
2. Straight Flush
3. Four of a Kind
4. 4 to a Royal Flush
5. Full House
6. Flush
7. Straight
8. Three of a Kind
9. 4 to a Straight Flush
10. Two Pair
11. High Pair (J–A)
12. 3 to a Royal Flush
13. 4 to a Flush
14. Low Pair (2–10)
15. 4 to an Outside Straight
16. 2 suited high cards
17. 3 to a Straight Flush
18. 2 unsuited high cards (lowest 2 if 3+)
19. Suited J/Q/K with 10
20. 1 high card
21. Discard everything

The player's hand is scanned top-to-bottom against this list; the first match is the optimal play. The brute-force calculator serves as verification and provides exact EV numbers.

---

## Pay Table Literacy Module

Before the player starts the main game, an optional interactive tutorial:

**The Pay Table Challenge** — The simulator displays two pay tables side by side (e.g., 9/6 vs. 8/5 Jacks or Better) and asks the player to identify which is the better game. The visual difference is tiny — one number changed in one row — but the return difference is 2.24% (worth $28/hour at $1.25/hand and 500 hands/hour). The tutorial shows the annual cost of playing the wrong machine: 4 hours/week × 50 weeks × $28/hour = $5,600/year. From one number on a pay table.

**The Max Coin Multiplier** — Shows why betting max coins matters. The royal flush pays 250 per coin at 1–4 coins but 800 per coin at 5 coins. That bonus is worth about 1.5% of the total return. Playing 4 coins instead of 5 on a 9/6 machine drops the return from 99.54% to about 98.0%. The simulator should refuse to let you play non-max coins without showing this warning (or at least flag it prominently).

**Machine Scout Mode** — A training exercise where the simulator shows a series of video poker pay tables (as you'd see walking through a casino) and the player identifies the return percentage and whether the machine is worth playing. Timed, scored, gamified. Teaches the real-world skill of scanning a casino floor for good video poker.

---

## Bot System

Video poker is a single-player game — there are no opponents and no table dynamics. But the bot system demonstrates different skill levels playing the same sequence of dealt hands.

**Implementation:** Bots are computed retroactively at session end (or on demand). The simulator replays every dealt hand from the session through each bot's strategy function, recording what the bot would have held and what the draw result would have been. This is computationally cheap (replay N hands × 4 bots × 1 strategy evaluation each) and avoids the complexity of running four parallel game states during live play. The player sees the comparison dashboard after their session, not during it.

**Perfect Pat** — Plays optimal strategy on every hand. Shows the theoretical best-case result. The benchmark.

**Gut-Feel Gary** — Makes common recreational mistakes: always holds a high card over a low pair, never breaks a paying hand for a draw, keeps kickers, avoids "risky" discards like throwing away a pair for four to a flush. His session return runs 96–97% versus the optimal 99.54%. The cost of his mistakes is tracked and displayed.

**Almost-Alice** — Plays the "simple strategy" (a simplified version of optimal strategy that sacrifices about 0.08% in return for much easier memorization). Shows that you can get 99.46% without memorizing every edge case.

**Superstitious Sam** — Believes in patterns. Holds cards based on "streaks" and "feelings." Changes strategy after a losing run. His results are statistically identical to random play minus the house edge — proving that the cards have no memory.

The session comparison shows all four bankroll lines on the same chart over hundreds of hands. Perfect Pat trends gently downward (even optimal play loses on most sessions due to variance — the positive EV only manifests over very long periods). Gut-Feel Gary's line drops much faster. The gap between them is the dollar value of skill.

---

## Convergence Viewer

A user-facing auto-play mode that runs thousands of hands at speed and visualizes the return percentage converging toward the theoretical value. This reuses the statistical validation harness (which must run millions of hands anyway) with a chart UI on top.

The player selects a variant and pay table, hits "Run," and watches a real-time chart of cumulative return percentage wobbling wildly in the early hands and gradually settling as the sample grows. At 100 hands the return might be anywhere from 85% to 115%. At 10,000 hands it's within a few tenths of a percent of the theoretical value. At 100,000 hands it's locked in.

This is one of the most visually compelling features in the simulator. It teaches variance, expected value, and the law of large numbers without a single equation — just a line on a chart settling into place. It also demonstrates why even +EV games like Deuces Wild are hard to profit from: the convergence is slow, and most realistic session lengths (200–500 hands) are still deep in the variance zone.

Configurable speed: 10 hands/second (watchable), 100/sec (fast-forward), max speed (no animation, just the final chart). Pause at any point to inspect individual hands.

---

## Accessibility

The simulator follows WCAG 2.1 AA guidelines and reflects the same ADA compliance standards applied to ICJIA production sites.

**Keyboard navigation:** Arrow keys move focus between the 5 cards. Space or Enter toggles hold/cancel on the focused card. Tab moves between control groups (cards → controls → training panel). Deal/Draw, Bet One, Bet Max all keyboard-accessible.

**Screen reader support:** Each card announces its rank and suit ("Ace of Spades"). Hold state is announced on toggle ("Held" / "Released"). Hand results are announced ("Winner — Full House, 9 credits"). The pay table is a semantic `<table>` with proper `<th>` headers. The training panel's EV data is structured with ARIA labels ("Optimal play: hold cards 1, 3, 5. Expected value: 1.218 coins").

**ARIA states:** Hold toggles use `aria-pressed`. The active winning hand row in the pay table uses `aria-current`. Error states (zero credits, max coin warning) use `aria-live` regions.

**Visual accessibility:** Sufficient color contrast on all card faces, hold indicators, and pay table text. Card suits use both color and shape (no reliance on color alone to distinguish hearts from diamonds). Animations respect `prefers-reduced-motion`.

**Testing:** axe-core integrated into the dev build. Zero violations required before each phase ships.

---

## Statistical Validation Suite

Like the craps simulator, the engine proves itself:

**Hand frequency validation** — Deal 1,000,000 hands and verify that hand frequencies match theoretical probabilities (royal flush: 1 in 649,740 for a 52-card deck; pair: ~42% of hands; etc.).

**Return percentage convergence** — Run 10,000,000 hands with optimal play and verify that the return converges to the pay table's theoretical value (99.54% ± 0.01% for 9/6 Jacks or Better).

**Optimal play verification** — For every hand in the strategy list, verify that the brute-force EV calculator produces the same recommended hold as the strategy lookup table. Zero discrepancies.

**Pay table return calculation** — For every supported pay table variant, verify the computed theoretical return against published values from the Wizard of Odds.

---

## Requirements Summary

### Tier 1 — Must Have (Jacks or Better family, no wild cards)

- Jacks or Better with configurable pay tables (9/6, 8/6, 8/5, 7/5, 6/5)
- Bonus Poker (8/5 full-pay) with its own strategy data
- Double Bonus (10/7 full-pay) with its own strategy data
- Double Double Bonus (9/6) with kicker-aware hand classifier
- Full 32-option EV calculator running in real time for every dealt hand
- Variant-agnostic `HoldAnalysis` interface using `Record<string, number>` for hand distributions
- Optimal play indicator showing correct holds after player commits
- Mistake cost display per hand and cumulative per session
- Hand history log — scrollable session record with per-hand EV breakdown
- Strategy list reference (viewable during play)
- Max coin warning system
- Pay table theoretical return display on setup screen
- Credit system with configurable denomination ($0.25, $0.50, $1.00)
- Deal and draw animations
- Hand result display with pay table highlight
- Session statistics: hands played, win rate, mistakes made, EV lost, effective return %
- Pay Table Literacy tutorial module
- Machine Scout training mode (timed pay table identification)
- Hand Category Trainer for targeted practice on common mistake hands
- Bot comparison system (Perfect Pat, Gut-Feel Gary, Almost-Alice, Superstitious Sam)
- Convergence viewer (auto-play mode visualizing return percentage convergence)
- Statistical validation suite proving engine correctness for all Tier 1 variants
- Accessibility: WCAG 2.1 AA, keyboard navigation, screen reader support, axe-core zero violations
- Responsive design, mobile playable

### Tier 2 — Should Have (Wild card variants)

- Wild-card-aware hand classifier using top-down hand-type evaluation
- Deuces Wild with full-pay pay table and 5-part strategy (by deuce count)
- Joker Poker (Kings or Better) with 53-card deck and strategy data
- Statistical validation for both wild variants
- Bot personas updated with wild-card strategy comparison
- Hand category trainer updated with wild-card-specific decision points

### Future (v2+)

- Multi-hand video poker (3-hand, 5-hand, 10-hand, 50-hand, 100-hand)
- Ultimate X (multiplier state between hands, bet-sizing strategy layer)
- Progressive jackpot modeling (breakeven analysis: at what jackpot level does the game become +EV?)
- Penalty card analysis display (showing when a discard affects the EV of remaining draws)
- Custom pay table builder with automatic return calculation and strategy generation
- Comparison mode: play the same dealt hands on two different pay tables simultaneously
- Exportable session history to see how the pay table difference affects results

---

## Relationship to the Simulator Collection

This simulator fills a unique niche in the collection:

| Simulator | What It Teaches |
|-----------|----------------|
| No-Limit Hold'em | Decisions against humans; reads, ranges, position |
| Craps | Bet selection against fixed math; which bets to avoid |
| Blackjack (future) | Decisions against the house; basic strategy and counting |
| Video Poker | Decisions against a pay table; the only beatable machine game |
| Roulette (future) | Systems are illusions; variance ≠ edge |
| Baccarat (future) | Patterns are illusions; cognitive bias exploitation |

Video poker is the bridge between the table games and the machines. It looks like a slot. It thinks like blackjack. It pays like nothing else in the casino. Teaching people this is genuinely valuable.

---

## Reference Sources

- Wizard of Odds — Jacks or Better optimal strategy and full strategy lists (wizardofodds.com)
- Wizard of Odds — Deuces Wild optimal strategy (wizardofodds.com)
- Wizard of Odds — Bonus Poker, Double Bonus, Double Double Bonus strategy and return tables
- Bob Dancer — Video Poker for Winners (software and strategy cards)
- VideoPokerTrainer.org — Online EV calculator and hand analyzer
- Stanford Wong — Professional Video Poker (book)

---

## File Structure

```
video-poker-simulator/
├── app/
│   ├── app.vue
│   ├── pages/
│   │   ├── index.vue                ← Setup / pay table selection
│   │   └── game.vue                 ← The machine
│   ├── components/
│   │   ├── Machine.vue              ← Main machine frame
│   │   ├── PayTableDisplay.vue      ← Always-visible pay table
│   │   ├── CardHand.vue             ← 5-card display with hold toggles
│   │   ├── TrainingPanel.vue        ← EV analysis, mistake tracking
│   │   ├── HandHistory.vue          ← Scrollable session hand log
│   │   ├── ControlBar.vue           ← Bet, Deal/Draw, speed controls
│   │   ├── SessionStats.vue         ← Running statistics
│   │   ├── BotComparison.vue        ← Post-session bot dashboard
│   │   ├── ConvergenceViewer.vue    ← Auto-play convergence chart
│   │   ├── PayTableLiteracy.vue     ← Tutorial module
│   │   ├── MachineScout.vue         ← Timed pay table identification
│   │   └── HandCategoryTrainer.vue  ← Targeted practice mode
│   ├── composables/
│   │   ├── useCardEngine.ts         ← Deck, deal, draw
│   │   ├── useHandEvaluator.ts      ← 5-card hand classification
│   │   ├── useWildEvaluator.ts      ← Wild-card-aware classification (Phase 5)
│   │   ├── useEVCalculator.ts       ← Brute-force 32-option analysis
│   │   ├── useStrategy.ts           ← Ranked strategy lookup
│   │   ├── usePayTable.ts           ← Pay table definitions and return calc
│   │   ├── useBots.ts               ← Bot strategy functions and replay
│   │   └── useHandHistory.ts        ← Session hand log management
│   ├── stores/
│   │   └── game.ts                  ← Pinia store: credits, hands, stats, history
│   └── utils/
│       ├── cards.ts                 ← Card types, deck generation
│       ├── combinations.ts          ← C(n,k) draw enumeration
│       └── handClassifier.ts        ← Royal, straight flush, etc.
├── docs/
│   ├── doc00-master-design.md
│   ├── doc01-phase1-machine-core.md
│   ├── doc02-phase2-strategy-training.md
│   ├── doc03-phase3-variants-literacy.md
│   ├── doc04-phase4-bots-validation.md
│   ├── doc05-phase5-wild-cards.md
│   ├── doc06-security.md
│   ├── doc07-llm-build-prompt.md
│   ├── doc08-differentiation.md
│   ├── doc09-monorepo-deployment.md
│   ├── doc10-revision-gap-analysis.md
│   ├── doc11-architecture-decisions.md
│   ├── doc12-use-cases.md
│   └── reference/
│       ├── jacks-or-better-strategy.json
│       ├── bonus-poker-strategy.json
│       ├── double-bonus-strategy.json
│       ├── double-double-bonus-strategy.json
│       ├── deuces-wild-strategy.json
│       └── joker-poker-strategy.json
├── tests/
│   ├── hand-evaluator.test.ts
│   ├── wild-evaluator.test.ts
│   ├── ev-calculator.test.ts
│   ├── strategy-parity.test.ts      ← Brute force matches strategy table
│   ├── return-convergence.test.ts
│   └── hand-frequency.test.ts
├── nuxt.config.ts
├── package.json
├── netlify.toml
└── yarn.lock
```
