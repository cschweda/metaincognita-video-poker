# Doc 01 — Phase 1: Machine & Core Engine

> **Project:** Video Poker Simulator
> **Phase:** 1 of 5
> **Scope:** Jacks or Better baseline — UI, deck, deal/draw cycle, hand classifier, credits
> **Depends on:** Nothing (this is the foundation)
> **Produces:** A playable Jacks or Better machine with configurable pay tables

---

## Phase Objective

Build a fully functional, single-variant video poker machine. At the end of Phase 1, a player can select a Jacks or Better pay table, insert credits, deal hands, toggle holds, draw, and see results — with correct hand classification and correct payouts. No strategy engine, no training panel, no bots. Just the machine.

This is the foundation everything else builds on. Every subsequent phase adds features to this working machine.

---

## Deliverables

### 1. Setup Page (`/`)

- Variant selector (Jacks or Better only in Phase 1; future variants slot in here)
- Pay table selector: 9/6, 8/6, 8/5, 7/5, 6/5
- Each pay table option displays its theoretical return percentage
- Denomination selector: $0.25, $0.50, $1.00
- Starting bankroll input (default: $100 = 400 credits at $0.25)
- "Deal Me In" button navigates to `/game`

### 2. Machine UI (`/game`)

**Pay table display (top of screen):**
- Full pay table for the selected variant, always visible
- Column for the current bet level (1–5 coins)
- Winning hand row highlights after each draw
- Theoretical return percentage shown in subtle text below the pay table
- Semantic `<table>` with `<th>` headers for accessibility

**Card area (center):**
- Five card positions, each showing card face (rank + suit) or card back (pre-deal)
- Card design: clean, readable, high contrast. Suits use both color and shape (not color alone)
- Each card has a HOLD/CANCEL toggle:
  - Click/tap toggles hold state
  - Visual: held cards raise slightly, show "HELD" label, highlighted border
  - Non-held cards dim slightly
  - `aria-pressed` on each toggle
  - Keyboard: arrow keys move between cards, Space/Enter toggles hold
- Screen reader announces rank and suit on focus ("Ace of Spades") and hold state on toggle ("Held" / "Released")

**Result area:**
- After draw: winning hand name ("Full House") and credit payout ("9 credits") displayed prominently
- Corresponding pay table row highlights
- Losing hands show "No Win" — no animation, no drama
- `aria-live="polite"` region for result announcement

**Control bar (bottom):**
- **Bet One** button: cycles bet 1 → 2 → 3 → 4 → 5 → 1
- **Bet Max** button: sets bet to 5 coins
- **Deal / Draw** button: dual-mode (deals when no hand active, draws when holds are set)
- **Credit display**: current credits, current denomination, dollar equivalent
- **Speed toggle**: animated deal/draw vs. instant (for later training use)

### 3. Card Engine (`useCardEngine.ts`)

```typescript
interface Card {
  rank: Rank    // 2-14 (14=Ace) or string enum
  suit: Suit    // 'hearts' | 'diamonds' | 'clubs' | 'spades'
  id: string    // unique identifier, e.g. '14s' for Ace of Spades
}

type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14
type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
```

- `createDeck(): Card[]` — Returns a standard 52-card deck (ordered)
- `shuffle(deck: Card[]): Card[]` — Fisher-Yates shuffle using `crypto.getRandomValues()` for RNG integrity (see Doc 06)
- `deal(deck: Card[]): { hand: Card[], remaining: Card[] }` — Deals 5 cards, returns hand and remaining 47
- `draw(hand: Card[], held: boolean[], remaining: Card[]): Card[]` — Replaces non-held cards from remaining deck

The deck is created fresh and shuffled for each hand. The remaining 47 cards after the initial deal are the only cards available for the draw — no reshuffling, no replacement. This matches real video poker machine behavior.

### 4. Hand Classifier (`handClassifier.ts`)

Classifies a 5-card hand into one of 10 categories (for Jacks or Better):

| Category | Detection Logic |
|----------|----------------|
| Royal Flush | 10-J-Q-K-A, all same suit |
| Straight Flush | 5 sequential ranks, all same suit |
| Four of a Kind | 4 cards of same rank |
| Full House | 3 of one rank + 2 of another |
| Flush | All 5 same suit, not sequential |
| Straight | 5 sequential ranks, not all same suit. Ace-low (A-2-3-4-5) counts |
| Three of a Kind | 3 of one rank, other 2 different |
| Two Pair | 2 of one rank + 2 of another |
| Jacks or Better | Pair of J, Q, K, or A |
| Nothing | None of the above |

Returns:

```typescript
interface HandResult {
  category: string       // e.g. 'royalFlush', 'flush', 'nothing'
  label: string          // display name, e.g. 'Royal Flush', 'Flush'
  payout: number         // coins won (0 for 'nothing'), from active pay table
  cards: Card[]          // the 5 cards
  winningCards?: number[] // indices of cards contributing to the win (for highlighting)
}
```

**Edge cases to handle:**
- Ace-low straight (A-2-3-4-5) — a.k.a. "the wheel." Valid straight, not a royal flush
- Ace-high straight (10-J-Q-K-A) — valid straight, and if all same suit, a royal flush
- Four of a kind with any kicker — in Phase 1 (JoB), kicker doesn't matter. Phase 3 adds kicker awareness for DDB

### 5. Pay Table System (`usePayTable.ts`)

```typescript
interface PayTable {
  id: string                            // e.g. 'jacks-or-better-9-6'
  variant: string                       // e.g. 'Jacks or Better'
  shortName: string                     // e.g. '9/6'
  theoreticalReturn: number             // e.g. 0.9954
  handPayouts: Record<string, number>   // category → coins per 1-coin bet
  maxCoinBonus: {                       // royal flush max coin bonus
    hand: string                        // 'royalFlush'
    standardPay: number                 // 250
    maxCoinPay: number                  // 800
  }
}
```

Phase 1 ships with 5 JoB pay tables: 9/6, 8/6, 8/5, 7/5, 6/5.

Pay table objects are static data. Adding a new pay table means adding a new object to the registry — no code changes.

### 6. Credit System (in Pinia store)

```typescript
interface GameState {
  credits: number              // current credit balance
  denomination: number         // dollar value per credit (0.25, 0.50, 1.00)
  coinsBet: number             // current bet (1-5)
  handsPlayed: number
  handsWon: number
  totalWagered: number         // cumulative credits bet
  totalReturned: number        // cumulative credits won
  // ... extended in Phase 2 with strategy/mistake tracking
}
```

- Credits deducted on Deal, added on winning Draw
- Bet persists between hands (player doesn't re-bet each hand unless they want to change it)
- Cannot Deal with zero credits — show "Insert Credits" message, disable Deal button

### 7. Deal/Draw Animation

- **Deal:** Cards appear one at a time, left to right, slight delay between each (~100ms). Card backs flip to faces.
- **Draw:** Non-held cards flip to backs, then flip to new faces.
- **Instant mode:** No animation, cards appear immediately. Toggle in control bar.
- All animations respect `prefers-reduced-motion` — if enabled, instant mode is forced.

---

## Accessibility Checklist (Phase 1)

- [ ] All card hold toggles use `aria-pressed`
- [ ] Each card announces rank and suit to screen readers
- [ ] Arrow key navigation between cards
- [ ] Tab navigation between control groups
- [ ] Pay table is semantic `<table>` with `<th>` headers
- [ ] Result announcement in `aria-live` region
- [ ] Zero credits state communicated to screen readers
- [ ] Color is never the sole indicator (suits use shape + color)
- [ ] Contrast ratio ≥ 4.5:1 on all text
- [ ] `prefers-reduced-motion` respected
- [ ] axe-core: zero violations

---

## Testing Checklist (Phase 1)

- [ ] Deck generation produces exactly 52 unique cards
- [ ] Shuffle produces statistically uniform distribution (chi-squared test over 100K shuffles)
- [ ] Hand classifier correctly identifies all 10 hand categories
- [ ] Hand classifier handles ace-low straight correctly
- [ ] Hand classifier handles ace-high straight (not royal) correctly
- [ ] Royal flush detection requires 10-J-Q-K-A of one suit (not just any ace-high straight flush)
- [ ] Pay table payouts match published values for all 5 JoB variants
- [ ] Credits deducted correctly on deal
- [ ] Credits added correctly on winning hands
- [ ] Max coin bonus applies to royal flush at 5-coin bet only
- [ ] Bet Max sets bet to 5
- [ ] Deal disabled at zero credits
- [ ] Hold toggles work via click, tap, and keyboard
- [ ] No accessibility violations (axe-core)

---

## What Phase 1 Does NOT Include

- EV calculator (Phase 2)
- Optimal play indicator (Phase 2)
- Mistake tracking (Phase 2)
- Hand history log (Phase 2)
- Strategy reference panel (Phase 2)
- Bonus Poker / Double Bonus / DDB variants (Phase 3)
- Pay Table Literacy tutorial (Phase 3)
- Machine Scout mode (Phase 3)
- Bots (Phase 4)
- Statistical validation (Phase 4)
- Convergence viewer (Phase 4)
- Wild card variants (Phase 5)
