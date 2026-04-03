# Doc 04 — Phase 4: Bots, Statistical Validation & Convergence Viewer

> **Project:** Video Poker Simulator
> **Phase:** 4 of 5
> **Scope:** Bot personas, session comparison, convergence viewer, statistical validation suite
> **Depends on:** Phase 3 (all Tier 1 variants with training support)
> **Produces:** Bot comparison dashboard, auto-play convergence visualization, engine correctness proof

---

## Phase Objective

Add the demonstration layer. Bots show what different skill levels look like over the same hands. The convergence viewer shows how mathematical expectation plays out over thousands of hands. The statistical validation suite proves the engine is correct. Together, these features answer the question every player asks: "Does skill actually matter, and how do I know this thing isn't rigged?"

---

## Deliverables

### 1. Bot Personas (`useBots.ts`)

Four bots, each implementing a strategy function with the same signature:

```typescript
type BotStrategy = (dealt: Card[], payTable: PayTable) => number[]
// Returns indices of cards to hold (same format as player holds)
```

**Implementation approach: retroactive replay.** Bots do not run during live play. Instead, after the player finishes a session (or on demand via a "Compare" button), the simulator replays every dealt hand from the session's hand history through each bot's strategy function. For each hand, the bot's hold decision is computed, and then every possible draw outcome is evaluated to compute the bot's expected result. This is computationally cheap — it's just N hands × 4 bots × 1 strategy evaluation each, plus the same draw enumeration the EV calculator already does.

The retroactive approach avoids complexity: no parallel game states during live play, no real-time synchronization, no performance impact on the player's experience. The bots analyze the same dealt hands the player saw, so the comparison is perfectly controlled.

**Perfect Pat:**
- Calls the brute-force EV calculator and holds the top-ranked option
- Always plays the mathematically optimal hold
- This is the benchmark — the best possible result for the session's dealt hands
- Expected session return: converges to the pay table's theoretical return

**Gut-Feel Gary:**
- Implements a rule-based "casual player" strategy with common mistakes:
  - Always holds a high card (J+) over a low pair
  - Never breaks a paying hand (e.g., keeps a made straight even when four-to-a-royal is present)
  - Keeps kickers (holds Ah-Kh when optimal play is hold Ah only)
  - Never discards all 5 cards
  - Holds inside straight draws (overvalues straights)
  - Holds "pretty" hands (suited connectors) even when not strategically justified
- Expected session return: 96–97% on JoB 9/6
- The gap between Gary and Pat is the dollar value of learning optimal strategy

**Almost-Alice:**
- Implements the "simple strategy" — a simplified version of optimal strategy published by the Wizard of Odds
- Sacrifices ~0.08% in return for a much shorter, easier-to-memorize strategy list (~15 entries instead of 30+)
- Expected session return: 99.46% on JoB 9/6
- The gap between Alice and Pat shows the cost of simplification (very small — proving that simple strategy is "good enough" for most players)

**Superstitious Sam:**
- Implements a pattern-seeking strategy:
  - After 3+ consecutive losses, switches to conservative holds (keeps more cards, avoids risky draws)
  - After a big win, plays more aggressively (draws more cards, chases bigger hands)
  - Holds "lucky" cards (keeps a 7 because "7 is lucky")
  - Avoids holding 13s (kings) after a loss streak
  - Core decisions are semi-random with bias
- Expected session return: 94–96% on JoB 9/6
- Point: the cards have no memory. Streaks are random. Sam's adjustments to streaks are pure superstition and cost him money

### 2. Session Comparison Dashboard (`BotComparison.vue`)

A post-session view showing how the player performed relative to all four bots.

**Bankroll chart:**
- Line chart with 5 lines: player + 4 bots
- X-axis: hand number (1 to N)
- Y-axis: cumulative credits (starting from the same initial bankroll)
- Each line uses a distinct color with a legend
- Hover on any point shows that hand's details
- The visual gap between lines is the cost of skill (or lack thereof)

**Summary table:**

| Player/Bot | Final Credits | Return % | Mistakes | EV Lost | Best Hand |
|------------|--------------|----------|----------|---------|-----------|
| You | 87.50 | 97.2% | 14 | $3.80 | Full House |
| Perfect Pat | 94.75 | 99.5% | 0 | $0.00 | Full House |
| Almost-Alice | 93.20 | 99.1% | 3 | $0.45 | Full House |
| Gut-Feel Gary | 78.50 | 96.4% | 31 | $8.20 | Straight |
| Superstitious Sam | 71.25 | 94.8% | 42 | $12.50 | Three of a Kind |

**Hand-by-hand comparison:** Select any hand from the session, see all 5 hold decisions side by side. "On hand #23, you held the ace kicker (EV: 0.82). Perfect Pat held the low pair (EV: 1.04). Gary held the same thing you did. Alice held the low pair. Sam held three random cards (EV: 0.47)."

### 3. Convergence Viewer (`ConvergenceViewer.vue`)

A user-facing auto-play mode that visualizes how the return percentage converges toward the theoretical value over large sample sizes.

**Controls:**
- Variant/pay table selector (any Tier 1 variant)
- Strategy selector: Optimal play, Simple strategy, or Random
- Speed: 10 hands/sec (watchable), 100/sec (fast-forward), max speed (no per-hand animation, batch computation, chart updates every 1000 hands)
- Pause/Resume
- Hand count target: 1K, 10K, 100K, 1M (warn that 1M will take a while)

**Display:**
- **Main chart:** Cumulative return percentage over hands played. Y-axis: 90%–110%. X-axis: hands played (log scale or linear, toggleable). The line wobbles wildly at first and gradually flattens toward the theoretical value.
- **Current stats:** Hands played, current return %, theoretical return %, standard deviation of return, largest win, largest loss streak
- **Hand distribution:** Live-updating bar chart of hand frequency (how many royals, straights, etc. so far vs. expected frequency)

**Implementation:**
- Reuses the EV calculator and hand classifier from Phases 1–2
- The auto-play loop: shuffle → deal → compute optimal hold → compute all draw outcomes → pick a random draw result → record stats → repeat
- At max speed, skip the "pick a random draw" step and instead compute the exact expected return per hand analytically (sum of all draw outcomes × probability). This is faster and converges to the same value. The chart then shows a rolling average of per-hand EVs rather than actual random results.
- Web Worker for computation to keep UI responsive

**Teaching points the viewer demonstrates:**
- Variance is real: 100-hand sessions can return anywhere from 80% to 120%
- The theoretical return is a long-run value: you need 10K+ hands before it stabilizes
- +EV games (Double Bonus, Deuces Wild) are still volatile — the line spends long stretches below 100% even though the theoretical value is above 100%
- Optimal play vs. random play: run both side by side and watch the gap grow

### 4. Statistical Validation Suite

Automated tests that prove the engine's mathematical correctness. These are developer-facing tests (run via `vitest`), not user-facing features — but the convergence viewer reuses the same computation engine, so the validation provides confidence in both.

**Test 1: Hand frequency validation (`hand-frequency.test.ts`)**
- Deal 1,000,000 random 5-card hands from a 52-card deck
- Count occurrences of each hand category
- Verify frequencies match theoretical probabilities within statistical tolerance (chi-squared test):
  - Royal flush: 1 in 649,740 (expect ~1.5 in 1M deals)
  - Straight flush: 1 in 72,193
  - Four of a kind: 1 in 4,165
  - Full house: 1 in 694
  - Flush: 1 in 509
  - Straight: 1 in 255
  - Three of a kind: 1 in 47
  - Two pair: 1 in 21
  - Pair (any): ~42% of hands
  - Jacks or better pair: ~21% of hands

**Test 2: Return percentage convergence (`return-convergence.test.ts`)**
- For each Tier 1 pay table (JoB 9/6, 8/6, 8/5, 7/5, 6/5, Bonus 8/5, Double Bonus 10/7, DDB 9/6):
  - Run 10,000,000 hands with optimal play (using the brute-force calculator's top hold + random draw)
  - Verify cumulative return converges to published theoretical value ± 0.02%

**Test 3: Optimal play verification (`strategy-parity.test.ts`)**
- For each variant's strategy table:
  - Generate a comprehensive test suite of hands covering every strategy entry
  - For each hand, verify the strategy lookup recommends the same hold as the brute-force calculator
  - Zero discrepancies allowed

**Test 4: Pay table return calculation**
- For each pay table, compute the theoretical return by exhaustive enumeration:
  - For all C(52,5) = 2,598,960 possible dealt hands:
    - Find the optimal hold (via brute-force 32-option evaluation)
    - Compute the EV of the optimal hold
  - Average all EVs = theoretical return
- Verify against Wizard of Odds published values ± 0.01%
- This is computationally expensive (~83M hand evaluations per variant) but only runs once as a verification step

---

## Accessibility Additions (Phase 4)

- [ ] Bot comparison chart has text alternative (summary table is the accessible equivalent)
- [ ] Convergence viewer chart has text summary updated at intervals
- [ ] Pause/resume controls keyboard-accessible
- [ ] Speed controls have ARIA labels
- [ ] axe-core: zero violations

---

## Testing Checklist (Phase 4)

- [ ] All four bot strategies produce expected return ranges on 10K+ hand sessions
- [ ] Perfect Pat return matches theoretical return ± 0.1% over 10K hands
- [ ] Gut-Feel Gary return is consistently lower than Perfect Pat
- [ ] Almost-Alice return is within 0.1% of Perfect Pat
- [ ] Bot replay uses the same dealt hands as the player's session
- [ ] Convergence viewer: return % visibly converges over time
- [ ] Convergence viewer: max speed computation doesn't block UI
- [ ] All four statistical validation tests pass
- [ ] No regressions in Phase 1/2/3 functionality

---

## What Phase 4 Does NOT Include

- Wild card variants (Phase 5)
- Wild-card-aware bot strategies (Phase 5)
- Wild card statistical validation (Phase 5)
