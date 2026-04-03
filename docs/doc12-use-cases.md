# Doc 12 — Use Cases

> **Project:** Video Poker Simulator
> **Purpose:** User stories, gameplay edge cases, error states, and expected behaviors

---

## User Stories

### US-01: First-Time Player

**As** a casino visitor who has never played video poker, **I want** to understand what makes video poker different from slots **so that** I can make informed decisions about which machines to play.

**Acceptance:** The Pay Table Literacy module (Phase 3) walks the user through pay table reading, the annual cost of bad pay tables, and the max coin multiplier — all before dealing a single hand.

### US-02: Recreational Player Learning Strategy

**As** a casual video poker player who knows the basics, **I want** to see the optimal play for each hand and understand why it's better than my instinct **so that** I can improve my return percentage.

**Acceptance:** Training mode (Phase 2) shows the optimal hold after the player commits, with EV numbers for both the player's choice and the optimal choice. The 32-option EV breakdown is available for deep analysis.

### US-03: Serious Player Practicing

**As** an experienced player preparing for a casino trip, **I want** targeted practice on the hands I get wrong most often **so that** I can close the gap between my play and optimal strategy.

**Acceptance:** Hand Category Trainer (Phase 3) deals specific hand types on demand. Hand History (Phase 2) lets the player review mistakes with full context. The session mistake tracker shows which categories have the most errors.

### US-04: Math-Curious Player

**As** someone interested in the mathematics behind gambling, **I want** to see how expected value and variance work over large samples **so that** I can understand why "the house always wins" (except when it doesn't).

**Acceptance:** Convergence Viewer (Phase 4) visualizes return percentage converging over thousands of hands. Bot Comparison (Phase 4) shows the dollar value of skill. The Double Bonus and Deuces Wild variants demonstrate positive-EV games that still lose money in most sessions.

### US-05: Casino Floor Preparation

**As** someone planning a video poker session, **I want** to practice identifying good machines quickly **so that** I can scan a casino floor efficiently and sit down at the right machine.

**Acceptance:** Machine Scout Mode (Phase 3) presents pay tables under time pressure and scores the player's ability to identify variant, return percentage, and play/walk decision.

### US-06: Variant Comparison

**As** a player who plays multiple video poker variants, **I want** to switch between Jacks or Better, Bonus Poker, Double Bonus, and DDB **so that** I can practice the correct strategy for each and understand how the strategy differences emerge from the pay table differences.

**Acceptance:** Setup page (Phase 3) offers all four Tier 1 variants. Each has its own strategy data. The training panel and EV calculator are variant-agnostic — switching variants doesn't change the training experience, only the strategy.

---

## Gameplay Edge Cases

### EC-01: Zero Credits

**Trigger:** Player's credit balance reaches 0.

**Expected behavior:**
- Deal button disabled
- Control bar shows "Insert Credits" message (or "Add Credits" button that resets to starting bankroll)
- `aria-live` region announces "No credits remaining"
- Player can still review hand history and session stats
- No game state corruption — credits cannot go negative

### EC-02: Hold All 5 Cards (Draw 0)

**Trigger:** Player holds all 5 dealt cards and clicks Draw.

**Expected behavior:**
- This is a legal play. The draw phase completes with no cards replaced.
- The result is the dealt hand's classification and payout.
- The EV calculator treats this as one of the 32 hold patterns (pattern 11111 = hold all). Its EV equals the dealt hand's payout.
- If this is the optimal play (e.g., dealt a full house), no mistake cost.
- If this is suboptimal (e.g., dealt a low pair and holding all 5 instead of just the pair), the mistake is flagged with cost.

### EC-03: Hold 0 Cards (Draw 5)

**Trigger:** Player holds no cards and clicks Draw.

**Expected behavior:**
- Legal play. All 5 cards replaced from the remaining 47 cards in the deck.
- The EV calculator computes this as hold pattern 00000. The EV is the average payout over all C(47,5) = 1,533,939 possible 5-card draws.
- Almost never optimal (only when all 5 dealt cards are completely worthless AND don't form any partial draw). But it's a valid choice and should be processed normally.

### EC-04: Pat Royal Flush Dealt

**Trigger:** The initial deal is a royal flush (probability: ~1 in 649,740).

**Expected behavior:**
- The hold/draw phase still runs normally. The player can toggle holds and draw if they want (though discarding from a pat royal is the worst possible play).
- The optimal play indicator will show "Hold all 5" with EV = 800 (at max coins) or 250 (at non-max coins).
- If the player somehow discards cards from a pat royal, the mistake cost is enormous and should be displayed.
- Do NOT auto-complete or skip the hold/draw phase. The player should see the royal, process it, and hold correctly. This is a teaching moment.

### EC-05: Pat Straight or Flush vs. Royal Draw

**Trigger:** The deal contains a pat straight or flush that also contains four to a royal flush. Example: 10h-Jh-Qh-Kh-9h (a straight flush — but breaking it to hold 10h-Jh-Qh-Kh and drawing for Ah gives a shot at the royal).

**Expected behavior:**
- The EV calculator will show that breaking the straight flush for the royal draw is suboptimal (the guaranteed 50-coin straight flush payout beats the ~1-in-47 chance of upgrading to an 800-coin royal).
- But for a pat *straight* with four to a royal (10h-Jh-Qh-Kh-3c), the math is different — breaking the 4-coin straight for a shot at 800-coin royal may be correct depending on the pay table.
- The training panel should show the exact EVs so the player understands these counterintuitive break/keep decisions.

### EC-06: Multiple Valid Strategy Matches

**Trigger:** A hand matches more than one entry in the strategy table. Example: Jh-Jd-10h-9h-8h matches both "High Pair (J–A)" and "4 to a Straight Flush."

**Expected behavior:**
- The strategy lookup scans top-to-bottom and returns the first match. Since "4 to a Straight Flush" (rank 9) is above "High Pair" (rank 11) in the JoB strategy, the correct play is to break the jacks and draw to the straight flush.
- The EV calculator will confirm this with exact numbers.
- This is one of the most common mistake points — many players refuse to break a paying hand for a draw. The Hand Category Trainer should have a category for this.

### EC-07: Max Coin Warning Dismissed Then Re-Triggered

**Trigger:** Player dismisses the max coin warning, plays at less than 5 coins, then starts a new session.

**Expected behavior:**
- The warning reappears each new session. It's not permanently dismissible.
- Within a session, dismissal persists — the player isn't nagged every hand.
- The session stats show effective return including the max coin penalty.

### EC-08: Variant Switch Mid-Session

**Trigger:** Player returns to the setup page and selects a different variant while a session is in progress.

**Expected behavior:**
- Prompt: "You have an active session (47 hands played). Switch variants and start a new session?"
- If confirmed: previous session's hand history and stats are available in a "Previous Session" view. New session starts fresh with the new variant.
- If cancelled: return to the game with the current session intact.

### EC-09: Denomination Change Impact

**Trigger:** Player selects a different denomination ($0.25 vs $1.00) between sessions.

**Expected behavior:**
- Denomination affects dollar amounts only, not credit calculations. 100 credits at $0.25 = $25.00; 100 credits at $1.00 = $100.00.
- Mistake costs are displayed in dollars at the active denomination.
- Session stats show dollar-denominated totals based on the session's denomination.

### EC-10: Convergence Viewer at Max Speed

**Trigger:** Player runs the convergence viewer at maximum speed targeting 1M hands.

**Expected behavior:**
- Computation runs in a Web Worker. UI remains responsive.
- Progress indicator shows hands computed and estimated time remaining.
- Chart updates at intervals (every 1,000 or 10,000 hands), not per-hand.
- "Cancel" button available to stop early.
- At completion, final chart with summary statistics.
- If the browser tab is backgrounded, computation continues (Web Worker isn't throttled by tab visibility in most browsers).

### EC-11: Deuce Discard Attempt (Deuces Wild)

**Trigger:** In Deuces Wild, the player tries to discard a deuce.

**Expected behavior:**
- **Training mode:** Allow the discard but show an immediate warning: "You are discarding a wild card. This is always suboptimal in Deuces Wild." The mistake cost will be large and visible after the draw.
- **Strict mode (optional toggle):** Prevent the discard entirely with a message: "Deuces are always held in Deuces Wild."
- The training panel always flags deuce discards as mistakes regardless of mode.

### EC-12: Joker Not Dealt (Joker Poker)

**Trigger:** In Joker Poker, the initial deal contains no joker (the joker is in the remaining 48-card draw pile).

**Expected behavior:**
- Normal play. The strategy uses the "no joker in hand" sub-strategy.
- The joker may appear on the draw. If it does, it substitutes as a wild card in the drawn hand.
- The EV calculator accounts for the joker being in the draw pile: some draw outcomes include the joker, which affects hand classification.

### EC-13: Bot Replay on Short Session

**Trigger:** Player plays only 1–5 hands then requests bot comparison.

**Expected behavior:**
- Bot comparison runs on however many hands were played, even 1.
- The chart and summary table display, but with a warning: "Short sessions have high variance. Play 50+ hands for a more meaningful comparison."
- Results are mathematically correct — just not statistically significant at small sample sizes.

### EC-14: Double Draw Attempt

**Trigger:** After the draw phase completes, the player clicks Deal/Draw again.

**Expected behavior:**
- The button transitions from "Draw" mode back to "Deal" mode after the draw completes and the result is displayed.
- Clicking "Deal" starts a new hand (deducting credits and dealing fresh from a new shuffled deck).
- There is no second draw. Each hand has exactly one deal and one draw — this matches real video poker machine behavior.

### EC-15: Browser Refresh Mid-Hand

**Trigger:** Player refreshes the page during the hold/draw phase.

**Expected behavior:**
- Game state is lost (client-side SPA, no persistence of in-flight hands).
- On reload, the setup page appears.
- Session hand history up to the last completed hand persists if stored in localStorage. The interrupted hand is lost.
- This is acceptable for a training tool. No real money is at stake.
