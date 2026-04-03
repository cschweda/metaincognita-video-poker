# Doc 11 — Architecture Decisions

> **Project:** Video Poker Simulator
> **Purpose:** Architecture Decision Records (ADRs) for key technical choices

---

## ADR-01: Yarn Instead of pnpm

**Status:** Accepted

**Context:** The developer's default stack for new projects uses pnpm. The simulator collection (No-Limit Hold'em, Craps, Video Poker) uses Yarn 1.22.22.

**Decision:** Use Yarn 1.22.22 for the Video Poker Simulator.

**Rationale:** Consistency across the simulator collection. All three simulators share the same tech stack and will be developed in overlapping timeframes. Using the same package manager avoids cognitive switching costs and ensures identical dependency resolution behavior. The simulators are personal projects with a single developer — the benefits of pnpm (speed, disk efficiency) are marginal at this scale.

**Consequences:** Lockfile is `yarn.lock`, not `pnpm-lock.yaml`. Install command is `yarn install`, not `pnpm install`. Build scripts in `package.json` and `netlify.toml` use Yarn.

---

## ADR-02: Record<string, number> for Hand Distributions

**Status:** Accepted

**Context:** The `HoldAnalysis` interface needs a `handDistribution` field that maps hand types to their probabilities for a given hold pattern. The original design used a fixed object:

```typescript
// Original (rejected)
handDistribution: {
  royalFlush: number
  straightFlush: number
  fourOfAKind: number
  // ... 7 more fields
}
```

This breaks for variants with different hand type counts: Double Double Bonus has 14 kicker-differentiated types, Deuces Wild has 12+ types.

**Decision:** Use `Record<string, number>` keyed by the variant's hand type category strings.

```typescript
// Adopted
handDistribution: Record<string, number>
```

**Rationale:** The EV calculator is variant-agnostic by design — it evaluates all 32 hold patterns against whatever classifier and pay table it's given. The hand distribution must be equally agnostic. Using a record type means the same interface works for:
- JoB (10 types): `{ royalFlush: 0.00002, straightFlush: 0.0001, ... }`
- DDB (14 types): `{ royalFlush: 0.00002, fourAcesLowKicker: 0.00003, fourAcesHighKicker: 0.00005, ... }`
- Deuces Wild (12 types): `{ naturalRoyal: 0.00001, fourDeuces: 0.00008, wildRoyal: 0.0003, ... }`

**Consequences:** Consumers of `handDistribution` must use dynamic key access rather than dot notation. TypeScript won't enforce that all expected keys are present — the pay table's hand type list is the source of truth for which keys to expect.

---

## ADR-03: Retroactive Bot Computation

**Status:** Accepted

**Context:** The bot system shows how four different skill levels perform on the same dealt hands as the player. Two implementation approaches:

- **Real-time parallel:** During live play, compute all four bot decisions alongside the player's. Requires maintaining four parallel game states (four separate draw results, four separate bankroll trackers) in real time.
- **Retroactive replay:** After the session, replay every dealt hand from the hand history through each bot's strategy function.

**Decision:** Retroactive replay.

**Rationale:**
1. **Simpler state management.** No parallel game states during live play. The Pinia store tracks only the player's game.
2. **No performance impact.** Bot computation happens after the session, not during dealing and drawing.
3. **Deterministic replay.** The hand history stores the dealt cards and remaining deck for each hand, so bot replay produces deterministic results.
4. **Better UX framing.** The bot comparison is a post-session analysis tool, not a real-time distraction. The player focuses on their own decisions during play, then reviews the comparison afterward.

**Consequences:** The hand history must store enough data to replay each hand (dealt cards, remaining deck state). The bot comparison dashboard is a separate view, not overlaid on the game screen during play. Players can't see bot performance in real time — they see it as a summary after their session.

**Trade-off:** Real-time parallel would allow a "race" visualization where the player watches all five bankroll lines move simultaneously. This is a compelling feature but not worth the implementation complexity. If desired later, it can be built on top of the retroactive system by replaying at speed with animation.

---

## ADR-04: Top-Down Hand-Type Evaluation for Wild Classifier

**Status:** Accepted

**Context:** The wild card classifier must determine the best achievable hand from N natural cards and W wild cards. Two approaches:

- **Brute-force assignment:** Try all possible card values for each wild card, classify each resulting hand, keep the highest-paying one. O(52^W) per evaluation.
- **Top-down type check:** Check hand types from highest-paying to lowest-paying. For each type, determine if the natural cards + W wilds can form it. Return the first match.

**Decision:** Top-down type check.

**Rationale:** Brute-force assignment is O(52^W). For 1 wild (Joker Poker), that's 52 evaluations — trivial. For 2 wilds, 2,704. For 3 wilds, 140,608 — too slow for real-time 32-option EV calculation (which calls the classifier millions of times). For 4 wilds, 7.3M — impossible in real time.

Top-down type check is O(H) where H is the number of hand types (~12). Each type check is O(1) or O(N) for the natural cards. Total: O(H × N) per evaluation, which is effectively constant.

The correctness of the top-down approach follows from the fact that the pay table defines a strict hand type hierarchy. The highest-paying achievable hand is always the one the player wants. The classifier just needs to find it, not enumerate all possibilities.

**Consequences:** Each hand type needs a dedicated "can these naturals + W wilds form this type?" function. This is more code than a single brute-force loop, but each function is small and independently testable. The test suite in Phase 5 must verify correct wild classification against a comprehensive edge-case list.

---

## ADR-05: Client-Side SPA (No SSR)

**Status:** Accepted

**Context:** Nuxt 4 supports SSR, SSG, and SPA modes. The video poker simulator has no server-side data, no SEO requirements for game content, and no dynamic server-side logic.

**Decision:** `ssr: false` — pure client-side SPA.

**Rationale:**
1. No server-side data to render. All content is generated client-side.
2. No SEO benefit from SSR — this is a web application, not a content site.
3. Simplest deployment: static files on Netlify CDN.
4. No serverless function costs or cold start latency.
5. Consistent with the Hold'em and Craps simulators.

**Consequences:** The setup page and game page are both client-rendered. Initial load includes the full application bundle. No server-side API routes available. All computation (EV calculator, convergence viewer, validation suite) runs in the browser.

---

## ADR-06: Single Pinia Store

**Status:** Accepted

**Context:** The application state includes: game configuration (variant, pay table, denomination), current hand state (dealt cards, holds, credits), session statistics, hand history, and UI state (training mode, speed setting). Some patterns split this into multiple stores.

**Decision:** Single Pinia store (`stores/game.ts`).

**Rationale:**
1. The state is tightly coupled. A hand's result depends on the pay table, which depends on the variant, which determines the credit payout, which updates the session stats. Multiple stores would need frequent cross-store references.
2. The total state is not large enough to benefit from splitting. There's no performance concern with a single reactive store at this scale.
3. Simplicity. One store, one source of truth, one place to debug state issues.

**Consequences:** The store file will grow as phases add features (hand history, bot data, convergence state). Use TypeScript interfaces and composable functions to keep the store organized even as it grows. If the store exceeds ~300 lines, consider extracting helper functions (not separate stores) to manage subsections.

---

## ADR-07: Strategy Data as Static JSON Files

**Status:** Accepted

**Context:** Each variant has an optimal strategy table (a ranked list of hand patterns). This data can be:
- (a) Hardcoded in TypeScript source
- (b) Stored as JSON data files and loaded at runtime
- (c) Generated programmatically from the EV calculator

**Decision:** Static JSON data files in `docs/reference/`, loaded at runtime. Verified by strategy-parity tests.

**Rationale:**
1. Separation of data and logic. Strategy tables are domain data from published sources (Wizard of Odds, Bob Dancer). They should be editable independently of code.
2. Adding a new variant = adding a new JSON file + a new pay table object. No code changes to the strategy engine.
3. The strategy-parity test (Phase 4) verifies that the JSON data matches the brute-force calculator's output. Transcription errors are caught automatically.

**Consequences:** JSON files must be kept in sync with the pay table definitions. The strategy-parity test is the safety net — it must run as part of the standard test suite and fail the build on any discrepancy.

Future: Option (c) — generating strategy tables programmatically — could be added as a developer tool. This would auto-generate the JSON files from the EV calculator, eliminating manual transcription entirely. Not prioritized for initial build.
