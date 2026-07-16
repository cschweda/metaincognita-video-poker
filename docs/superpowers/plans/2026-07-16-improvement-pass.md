# Improvement Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the full 2026-07-16 audit findings: resilience bug fixes, WCAG AA contrast/keyboard fixes, test & CI hardening, and duplication-killing refactors — no new features.

**Architecture:** Four phases, each independently shippable and committed separately: (A) game-store/worker resilience fixes, (B) design tokens + accessibility, (C) tests/CI/docs hardening, (D) shared-helper and component extraction refactors. Every phase ends with `pnpm lint && pnpm typecheck && pnpm test` green.

**Tech Stack:** Nuxt 4 (SPA, `ssr:false`), Vue 3, Pinia, Nuxt UI 4, Tailwind 4, Vitest 4, pnpm.

## Global Constraints

- Never add AI co-author trailers to commits (user global instruction).
- Commits only after 18:00 America/Chicago (user preference).
- Static-only deploy: never add server routes or Netlify functions.
- All currency displayed in dollars; always max bet (5 coins) — do not add bet controls.
- Dark neon aesthetic per `docs/design-system.md`; NLH simulator is the canonical UI reference.
- The exact-EV oracle tests in `tests/strategyLookup.test.ts` must keep passing untouched — they are the correctness contract for any classifier/strategy refactor.
- `docs/` (excluding this plans folder) is reference material; only edit the specific drift items listed.

---

## Phase A — Resilience bug fixes

### Task A1: Worker failure recovery in evAnalysisClient

**Files:**
- Modify: `app/utils/evAnalysisClient.ts`
- Test: `tests/evAnalysisClient.test.ts`

**Interfaces:**
- Produces: same public API (`analyzeHandAsync`), but a worker timeout/error only fails the offending request; the next call constructs a fresh worker instead of permanently falling back to sync main-thread analysis.

- [ ] Write failing test: after one simulated worker failure, a subsequent `analyzeHandAsync` call attempts to construct a Worker again (assert constructor called twice) rather than running sync.
- [ ] Implement: replace the permanent `workerFailed` boolean with per-request timeout handling + worker teardown/recreate on next call.
- [ ] `pnpm vitest run tests/evAnalysisClient.test.ts` → PASS.

### Task A2: Analysis error surfaced instead of infinite spinner

**Files:**
- Modify: `app/stores/game.ts` (add `.catch`, `analysisError` ref, reset on deal)
- Modify: `app/components/TrainingPanel.vue` (error state alongside the loading state)
- Test: `tests/gameStoreAsyncAnalysis.test.ts`

**Interfaces:**
- Produces: `game.analysisError: Ref<boolean>`, cleared on each deal/reset; TrainingPanel renders a "couldn't analyze" fallback when true. Drawing still works.

- [ ] Failing test: rejecting analysis sets `analysisError = true`; next deal clears it.
- [ ] Implement store catch + template fallback.
- [ ] Suite green.

### Task A3: Reactive session clock

**Files:**
- Modify: `app/stores/game.ts` (`now` ref + `tickClock()`; `sessionElapsedMinutes`/`handsPerHour`/`effectiveHourlyRate` read `now.value`)
- Modify: `app/components/BankrollPanel.vue` (30s `setInterval` on mount calling `game.tickClock()`, cleared on unmount)
- Test: `tests/gameStoreSession.test.ts`

- [ ] Failing test: advancing fake time + `tickClock()` updates `sessionElapsedMinutes`.
- [ ] Implement; suite green.

### Task A4: Cancel deal/draw timers on reset

**Files:**
- Modify: `app/stores/game.ts` (track pending timeout handles; `clearTimeout` in `resetGame`/`resetSession`/`endSession`)
- Test: `tests/gameStoreSession.test.ts`

- [ ] Failing test (fake timers): `deal()` then `resetSession()` mid-animation, then run all timers → `stats.handsPlayed === 0`, `handHistory` empty, `phase === 'idle'`.
- [ ] Implement handle tracking; suite green.

### Task A5: "No Win" contrast

**Files:**
- Modify: `app/components/ResultDisplay.vue` (loss text `rgba(170,170,200,0.3)` → solid ≥4.5:1 muted, e.g. `#8f96bd`)

- [ ] Apply; visual check via existing styles only. (Token pass in Phase B will consume this color.)

**Commit A (after 18:00 CT):** `fix: worker recovery, analysis error state, live session clock, reset-safe timers, loss-text contrast`

---

## Phase B — Design tokens + accessibility

### Task B1: Promote semantic colors to CSS custom properties

**Files:**
- Modify: `app/assets/css/main.css` — add to `:root`:

```css
:root {
  --vp-gold: #c9a227;
  --vp-gold-bright: #ffd60a;
  --vp-win: #4ade80;
  --vp-loss: #f87171;
  --vp-muted: #7f8bc9;      /* lifted from #5560a0 for AA */
  --vp-muted-strong: #9aa3d0; /* lifted from #6670a0; payout numbers */
}
```

- Modify: `GameMachine.vue`, `SingleCard.vue`, `ControlBar.vue`, `PayTableDisplay.vue`, `ResultDisplay.vue`, `TrainingPanel.vue`, `BankrollPanel.vue` — replace hardcoded `#c9a227`/`#ffd60a`/`#4ade80`/`#f87171`/`#5560a0`/`#6670a0` with `var(--vp-*)`.
- Leave `AppHubLink.vue` literal amber (documented as intentional suite chrome).

- [ ] Replace + verify zero remaining hardcoded occurrences: `grep -rn "#5560a0\|#6670a0\|#c9a227\|#ffd60a" app/components app/pages` → only tokens file.

### Task B2: Contrast floor for Tailwind grays

**Files:**
- Modify: `history.vue`, `analysis.vue`, `game.vue`, `index.vue` footers/metric labels: `text-gray-600` → `text-gray-500` only for decorative separators; meaningful labels/text `text-gray-500` → `text-gray-400`.

- [ ] Apply; spot-check with contrastcap after dev server is up (Phase B verification).

### Task B3: Focusable teaching tooltips

**Files:**
- Modify: `app/components/BankrollPanel.vue` — each `UTooltip`-wrapped stat row becomes a focusable trigger (`<button type="button" class="bp-row">`), keyboard-reachable; sparkline dot tooltips get `tabindex="0"` triggers or an sr-only summary alternative.

- [ ] Apply; `pnpm typecheck` green; tab order sanity check in tests where feasible.

### Task B4: Names, keyboard paths, touch targets

**Files:**
- Modify: `analysis.vue` — `aria-label="Hands per run"` / `aria-label="Number of runs"` on the two selects.
- Modify: `index.vue` — variant group cards become `<button type="button" role="radio" :aria-checked>` in a `role="radiogroup"`; denomination buttons `py-1.5` → `py-2.5`.
- Modify: `game.vue` — `.vp-nav__tab` padding `5px 12px` → `10px 14px`; `.vp-nav__subtab` `3px 10px` → `8px 12px`.
- Modify: `RulesModal.vue:16` — title guard: `rules ? \`${rules.variant} — Rules & Strategy\` : 'Rules'`.

- [ ] Apply all; lint/typecheck/test green.

**Commit B:** `fix(a11y): AA contrast tokens, focusable tooltips, labeled selects, keyboard variant cards, touch targets`

---

## Phase C — Tests, CI, docs

### Task C1: handClassifier direct tests

**Files:**
- Create: `tests/handClassifier.test.ts` — mirror wildClassifier test style. Must pin at minimum:
  - JoB: royal, straight flush, quads, full house, flush, straight (incl. A-2-3-4-5 and 10-J-Q-K-A), trips, two pair, jacks-or-better pair vs low pair (10s) → nothing.
  - Bonus: quad aces vs quad 2-4 vs quad 5-K distinct classes.
  - DDB: quad aces + 2/3/4 kicker (400-coin class) vs + 5-K kicker (160-coin class); quad 2-4 + A-4 kicker vs other kicker; boundaries per `payTables.ts` ids.

- [ ] Write tests (expect ~25 cases), run → PASS against current classifier (these are pinning tests; if any FAIL, that's a real bug — stop and investigate).

### Task C2: Seedable RNG + fast simulation PRNG

**Files:**
- Create: `app/utils/prng.ts`:

```ts
/** mulberry32 — fast seedable PRNG for simulation/tests (not for real deals). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
/** Uniform int in [0, n) from a unit-interval PRNG. */
export function prngInt(rng: () => number, n: number): number {
  return Math.floor(rng() * n)
}
```

- Modify: `app/utils/cards.ts` — `shuffle(deck, randInt: (n: number) => number = cryptoRandomInt)`; default behavior unchanged (crypto rejection sampling stays for real play).
- Modify: `app/utils/simulationWorker.ts` — use `mulberry32` seeded per run for shuffles.
- Test: `tests/shuffle.test.ts` add determinism case: same seed ⇒ identical order; different seeds ⇒ different order.

- [ ] Failing determinism test → implement → PASS. Full shuffle statistics suite still green (crypto path untouched).

### Task C3: Coverage config + fast/statistical split

**Files:**
- Modify: `vitest.config.ts` — `test.projects`: `fast` (excludes `tests/shuffle.test.ts`, `tests/strategyLookup.test.ts`), `statistical` (those two); shared env. Add `coverage: { include: ['app/**/*.{ts,vue}'] }` (report-only; thresholds after baseline is known).
- Modify: `package.json` — `"test:fast": "vitest run --project fast"`.

- [ ] `pnpm test:fast` < ~15s; `pnpm test` still full suite.

### Task C4: CI + Netlify gating + ogImage

**Files:**
- Modify: `.github/workflows/ci.yml` — `on: [push, pull_request]`; drop single-entry matrix.
- Modify: `netlify.toml` — build command `pnpm lint && pnpm typecheck && pnpm test:fast && pnpm generate` (full statistical suite stays in GitHub CI).
- Modify: `app/app.vue` `useSeoMeta` — add `ogImage: '/hero.png'`, `twitterCard: 'summary_large_image'`; consolidate the title/description duplicated in `nuxt.config.ts`.

- [ ] Apply; `pnpm generate` succeeds locally.

### Task C5: Docs drift

**Files:**
- Modify: `docs/doc11-architecture-decisions.md` — ADR-01 rewritten pnpm (supersede yarn); ADR-06 note two stores (game + analysis) with rationale; ADR-07 superseded by compiled TS tables graded in tests.
- Modify: `README.md` — remove the localStorage tab-close bullet; testing section mention fast/statistical split.
- Modify: `CHANGELOG.md` — correct test count; add Unreleased entries for phases A–D.

- [ ] Apply.

**Commit C:** `test+ci: handClassifier suite, seedable PRNG, fast/statistical split, PR trigger, gated Netlify build, og:image, docs drift`

---

## Phase D — Refactors

### Task D1: `handShape` shared primitive

**Files:**
- Create: `app/utils/handShape.ts`:

```ts
import type { Card } from './cards'

export interface HandShape {
  ranks: number[]            // sorted ascending
  rankCounts: Map<number, number>
  countGroups: number[]      // e.g. [3,2] for a full house, sorted desc
  isFlush: boolean
  isStraight: boolean        // includes A-2-3-4-5 wheel
  straightHigh: number | null // 5 for the wheel
}
export function handShape(cards: Card[]): HandShape { /* single implementation */ }
```

- Modify consumers to use it: `handClassifier.ts`, `wildClassifier.ts` (`classifyNoWilds`), `botPersonas.ts` (Alice/Gary inline derivations), `strategyLookup.ts:226-232`, `holdDescription.ts:34-57`.
- Tests: existing suites are the safety net (`strategyLookup` oracle + new `handClassifier.test.ts` + `wildClassifier.test.ts` + 60k tripwire must all stay green).

- [ ] Extract, migrate one consumer at a time, full suite green after each.

### Task D2: Combination generation consolidation

**Files:**
- Modify: `app/utils/combinations.ts` — add `forEachCombination<T>(items, k, cb)` (no materialization); keep `combinations` as thin wrapper for existing callers that need arrays.
- Modify: `app/utils/evCalculator.ts` — enumerate via `forEachCombination` (O(1) memory).
- Modify: `app/utils/strategyLookup.ts` — replace local `choose<T>` with the shared helper.
- Modify: `app/utils/simulationWorker.ts` — delete dead `type: 'run'` branch.

- [ ] Full suite green (EV values identical); memory spike gone by construction.

### Task D3: History rendering + growth caps

**Files:**
- Modify: `app/pages/history.vue` — hoist `maxAbs` computed for trend bars (kills O(n²)).
- Modify: `app/stores/game.ts` — cap `handHistory` at 500 entries (trim oldest on unshift). `dealtDecks` stays unbounded (needed for persona replay; sessions bounded by 5-min inactivity timeout).
- Modify: `app/stores/game.ts` — key `pendingDrawReconcile` on `analysisToken` instead of card-id equality.
- Modify: `app/stores/analysis.ts` — `typeof Worker === 'undefined'` guard with user-visible error instead of throw.

- [ ] Suite green.

### Task D4: Shared UI components

**Files:**
- Create: `app/components/AppFooter.vue` (from the 4 page footers; includes `AnalysisStatus`, uses `UIcon name="i-simple-icons-github"` instead of inline octocat path).
- Create: `app/components/PersonaComparison.vue` (from `TrainingPanel.vue:536-610` + `history.vue:268-318`).
- Create: `app/components/HoldOptionsTable.vue` (props: `options`, `limit?`, `highlightHeld?`).
- Create: `app/components/BankrollSparkline.vue` (from `BankrollPanel.vue:28-88,179-227` + CSS).
- Create: `app/components/StatRow.vue` (label/value/tooltip row, focusable trigger from B3).
- Create: `app/utils/format.ts` — `formatDollars(coins: number, denomination: number): string`, `returnTier(pct: number): 'win' | 'even' | 'loss'` (thresholds ≥99 / ≥96).
- Modify: 4 pages + TrainingPanel + BankrollPanel to consume; delete dead CSS (`.tp-comparison`, `.tp-play-*`, `.bp-credits`); replace inline styles with classes.

- [ ] Each extraction: lint/typecheck/test green before the next.

### Task D5: TrainingPanel decomposition

**Files:**
- Create: `app/components/training/OptimalPlay.vue`, `CurrentSelection.vue`, `ResultBanner.vue`, `HandRecap.vue`, `SessionStats.vue`, `HandHistoryList.vue`.
- Modify: `TrainingPanel.vue` → phase-switch shell (~100 lines) composing the above + `HoldOptionsTable` + `PersonaComparison`.

- [ ] Behavior-identical; suite + typecheck green; manual dev-server smoke of all 5 phases.

**Commit D (may be several):** `refactor: shared handShape/combination primitives, component extraction, TrainingPanel decomposition, history perf`

---

## Final verification

- [ ] `pnpm lint && pnpm typecheck && pnpm test` all green.
- [ ] `pnpm generate` builds.
- [ ] Dev-server smoke: deal → hold → draw → result; history page; analysis run; rules modal; keyboard-only pass.
- [ ] CHANGELOG updated; plan checkboxes complete.

## Explicitly out of scope

- Machine Scout mode, Convergence Viewer changes, Supabase persistence, Hand Category Trainer (roadmap features — separate design sessions).
- Dropping the old git stash (user's call; surfaced in report).
- Bet-control re-introduction, denomination mid-session guards (YAGNI — currently unreachable states).
