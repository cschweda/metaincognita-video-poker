# Doc 05 — Phase 5: Wild Card Engine & Wild Variants

> **Project:** Video Poker Simulator
> **Phase:** 5 of 5
> **Scope:** Wild-card-aware classifier, Deuces Wild, Joker Poker, wild variant validation
> **Depends on:** Phase 4 (all Tier 1 features complete and validated)
> **Produces:** Two wild card variants fully playable with training, bots, and validation

---

## Phase Objective

Build the wild-card-aware hand classifier and use it to add Deuces Wild and Joker Poker to the simulator. This is the only phase that requires a fundamentally new engine component — the wild classifier. Everything else (EV calculator, training panel, bots, validation) is variant-agnostic from Phases 1–4 and works automatically once the classifier is in place.

---

## Deliverables

### 1. Wild-Card-Aware Hand Classifier (`useWildEvaluator.ts`)

The wild classifier replaces (or wraps) the Phase 1 hand classifier for wild card variants. It must:

1. **Count wild cards** in the hand (deuces for Deuces Wild, joker for Joker Poker)
2. **Separate** the hand into natural cards and wild cards
3. **Classify the natural cards** using the existing Phase 1 classifier as a subroutine
4. **Determine the best achievable hand** by assigning wilds optimally against the active pay table's hand hierarchy

**The key insight: evaluate hand types, not card assignments.** Rather than trying all possible card substitutions (which is O(52^w) for w wild cards), the classifier checks hand types from the top of the pay table downward:

```
Given N natural cards and W wild cards:
  Can these natural cards + W wilds make a natural royal flush? → Check
  Can they make four deuces (Deuces Wild only)? → Check
  Can they make a wild royal flush? → Check
  Can they make five of a kind? → Check
  Can they make a straight flush? → Check
  ... continue down the hand hierarchy ...
  Return the highest-paying match
```

Each check is a focused test. Examples:

- **Can 3 natural cards + 2 wilds make a straight flush?** Check if the 3 naturals are suited and can form 5 consecutive ranks with 2 gaps filled by wilds.
- **Can 2 natural cards + 3 wilds make four of a kind?** Always yes (three wilds + any matching natural = four of a kind). But check higher hand types first.
- **Can 1 natural card + 4 wilds make five of a kind?** Always yes. But "four deuces" (a special Deuces Wild hand type) ranks higher — check that first.

**Extended hand hierarchy (Deuces Wild, 12 types):**

| Rank | Hand Type | Detection with Wilds |
|------|-----------|---------------------|
| 1 | Natural Royal Flush | 10-J-Q-K-A same suit, zero wilds used |
| 2 | Four Deuces | Exactly 4 deuces in the hand |
| 3 | Wild Royal Flush | Royal flush using 1+ wilds |
| 4 | Five of a Kind | 4+ of one rank (counting wilds) |
| 5 | Straight Flush | 5 sequential same suit (counting wilds) |
| 6 | Four of a Kind | 4 of one rank (counting wilds) |
| 7 | Full House | 3+2 of different ranks (counting wilds) |
| 8 | Flush | 5 same suit (counting wilds) |
| 9 | Straight | 5 sequential (counting wilds) |
| 10 | Three of a Kind | 3 of one rank (counting wilds) |
| 11 | Nothing | None of the above |

Note: Deuces Wild has no "Two Pair" or "Pair" — pairs aren't paid, and two pair with wilds would always be promoted to a better hand.

**Extended hand hierarchy (Joker Poker, 12 types):**

| Rank | Hand Type |
|------|-----------|
| 1 | Natural Royal Flush |
| 2 | Five of a Kind |
| 3 | Wild Royal Flush |
| 4 | Straight Flush |
| 5 | Four of a Kind |
| 6 | Full House |
| 7 | Flush |
| 8 | Straight |
| 9 | Three of a Kind |
| 10 | Two Pair |
| 11 | Kings or Better |
| 12 | Nothing |

**Interface:**

```typescript
interface WildHandResult {
  category: string            // e.g. 'wildRoyalFlush', 'fiveOfAKind', 'fourDeuces'
  label: string               // display name
  payout: number              // from active pay table
  cards: Card[]               // all 5 cards
  naturalCards: Card[]         // non-wild cards
  wildCards: Card[]            // wild cards
  wildCount: number
  bestAssignment?: string     // human-readable description of what the wilds represent
}
```

### 2. Wild-Aware EV Calculator

The Phase 2 EV calculator already works with any hand classifier — it calls the classifier on each draw outcome and looks up the pay table. The only change for wild variants:

- **Deuces Wild:** The remaining deck after dealing 5 cards has 47 cards (same as JoB). No change to draw enumeration. The classifier is the only thing that changes.
- **Joker Poker:** The deck is 53 cards (52 + joker). After dealing 5, the remaining deck has 48 cards. Draw enumeration changes: C(48, drawCount) instead of C(47, drawCount). This is a parameter, not a structural change.

**Performance note:** The wild classifier is more expensive per evaluation than the standard classifier (it checks more hand types and may need to test wild assignments). Estimated overhead: 2–5× slower per classification. The total EV computation goes from ~50–200ms to ~100–500ms per hand. If this exceeds the 500ms target from Phase 2, offload to a Web Worker.

### 3. Deuces Wild Implementation

**Pay table:** Full-pay Deuces Wild (100.76% return with optimal play).

**Strategy data:** Five separate ranked strategy lists, organized by deuce count in the dealt hand:

- **0 deuces (most common, ~67% of hands):** ~25 entries. Standard poker-like strategy but adjusted for the wild-card-affected hand frequencies.
- **1 deuce (~28% of hands):** ~15 entries. The deuce is always held. Strategy focuses on what to keep alongside it.
- **2 deuces (~5% of hands):** ~10 entries. Both deuces always held.
- **3 deuces (~0.3% of hands):** ~4 entries. All three held. Almost always hold only the deuces unless you have a natural pair (making five of a kind) or a wild royal draw.
- **4 deuces (~0.003% of hands):** 1 entry. Hold all four deuces. Always. (The fifth card doesn't matter — four deuces is a fixed 200-coin hand.)

**Key rule: never discard a deuce.** The strategy engine should enforce this — if the player tries to discard a deuce, the UI should warn them (or, in training mode, simply flag it as a guaranteed mistake).

**Setup page:** Deuces Wild appears as a variant option with the full-pay pay table and return percentage displayed.

### 4. Joker Poker (Kings or Better) Implementation

**53-card deck:** Add one Joker to the standard 52-card deck:

```typescript
const joker: Card = { rank: 0, suit: 'joker', id: 'joker' }
// rank 0 signals wild card; suit 'joker' is unique
```

`createDeck()` accepts a parameter for including the joker. The rest of the card engine handles 53 cards without structural changes.

**Pay table:** Full-pay Joker Poker Kings or Better (100.64% return with optimal play).

**Strategy data:** Two sub-strategies:
- **Joker in hand:** ~20 entries. Joker is always held. Strategy focuses on what to keep alongside it.
- **No joker:** ~25 entries. Standard strategy adjusted for the 53-card deck and "Kings or Better" minimum pay hand.

**Minimum pay hand:** Kings or Better (pair of kings or aces). This is different from JoB's "Jacks or Better" — the single wild card makes lower pairs too common to pay. The classifier must use the variant's minimum pay threshold when determining whether a pair is a paying hand.

### 5. Bot Strategy Updates

Each bot needs a wild-card-aware strategy variant:

- **Perfect Pat:** No change — already uses the brute-force EV calculator, which now calls the wild classifier
- **Gut-Feel Gary:** Add wild-card mistakes: sometimes discards a deuce "because it's only a 2," holds wilds alongside losing hands, doesn't understand the five-of-a-kind concept
- **Almost-Alice:** Uses a simplified version of the deuce-count-organized strategy
- **Superstitious Sam:** Same superstitious behavior, now applied to wilds ("I always get lucky when I hold the joker with a heart")

### 6. Hand Category Trainer Updates

Add wild-card-specific decision categories:

- Deuce + four to a flush vs. deuce + low pair (Deuces Wild)
- Wild royal draw vs. made four of a kind (Deuces Wild)
- Joker + three to a royal vs. joker + made straight (Joker Poker)
- Two deuces + three to a straight flush vs. two deuces alone
- Three deuces: hold only deuces vs. hold deuces + natural pair

### 7. Statistical Validation for Wild Variants

**Hand frequency (Deuces Wild):**
- Deal 1,000,000 hands, classify with wild classifier
- Verify frequencies of all 12 hand types against published probabilities
- Key check: four deuces frequency ~1 in 4,909 dealt hands (before drawing)

**Hand frequency (Joker Poker):**
- Deal 1,000,000 hands from 53-card deck
- Verify hand frequencies account for the joker's presence

**Return convergence:**
- Deuces Wild: 10M hands with optimal play → 100.76% ± 0.02%
- Joker Poker: 10M hands with optimal play → 100.64% ± 0.02%

**Strategy parity:**
- All 5 Deuces Wild sub-strategies verified against brute-force calculator
- Both Joker Poker sub-strategies verified against brute-force calculator

---

## Accessibility Additions (Phase 5)

- [ ] Wild cards visually and semantically distinct (screen reader announces "Two of Hearts — wild" for deuces, "Joker — wild" for joker)
- [ ] "Never discard a deuce" warning accessible via screen reader
- [ ] Extended hand hierarchy readable in strategy reference panel
- [ ] Five-of-a-kind and four-deuces results announced correctly
- [ ] axe-core: zero violations

---

## Testing Checklist (Phase 5)

- [ ] Wild classifier: 2-2-2-7-7 = five of a kind (five 7s)
- [ ] Wild classifier: 2-2-2-2-K = four deuces (not five of a kind)
- [ ] Wild classifier: 2-10-J-Q-K suited = wild royal flush
- [ ] Wild classifier: 10-J-Q-K-A suited = natural royal flush (even in Deuces Wild)
- [ ] Wild classifier: 2-2-A-A-A = five aces (five of a kind)
- [ ] Wild classifier: Joker-10-J-Q-K suited = wild royal flush
- [ ] Wild classifier: Joker-7-7-7-2 = four 7s (four of a kind, not five of a kind — joker fills the 4th)
- [ ] Joker Poker: 53-card deck generates all 53 unique cards
- [ ] Joker Poker: draw pool is 48 cards (not 47)
- [ ] Deuces Wild: EV calculator handles wild classifications correctly
- [ ] Deuce discard warning fires when player tries to discard a deuce
- [ ] All wild variant statistical validations pass
- [ ] Strategy parity: zero discrepancies for all wild sub-strategies
- [ ] Convergence viewer works with Deuces Wild and Joker Poker
- [ ] Bot comparison works with wild variants
- [ ] No regressions in Tier 1 functionality
