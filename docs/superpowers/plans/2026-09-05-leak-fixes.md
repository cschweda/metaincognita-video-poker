# Leak Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every leak found by the 2026-09-05 exhaustive exact-EV audit — the strategy tables that drive bot play, the mislabeled personas, the mistake-tracking races in the game store, the analysis page's silent failure, and the display regressions from the last refactor — then commit and push.

**Architecture:** The audit built inclusion–exclusion sum tables from the app's own classifier so that every hold's exact EV is a handful of lookups; that engine moves into `tests/helpers/exactEv.ts` and becomes the regression guard for the strategy tables. The tables themselves are replaced by the audited version (every rule verified over all 2,598,960 deals per pay table). Store fixes key the draw-before-analysis reconcile per hand and capture the wager with it. Personas become honest: Almost Alice is rewritten as the published simple strategy, the other two stop discarding deuces, and every label is the measured number.

**Tech Stack:** Nuxt 4 (SPA, `ssr: false`), Pinia, TypeScript, Vitest (projects `fast` and `statistical`), esbuild-free (Vite), pnpm.

**Spec:** The audit report (Perfect Pat Audit artifact, 2026-09-05) and the 15-finding code review of commit 18e2692 summarized in it.

## Global Constraints

- Static-only: `pnpm generate` → `dist`; never add `server/` or Netlify functions.
- No AI co-author trailers in commit messages (user rule). Commits on `main`, pushed to `origin`.
- Every classifier/strategy change must keep `pnpm test` (both projects) green and `pnpm typecheck`/`pnpm lint` clean; Netlify gates deploys on lint + typecheck + fast tests.
- Design tokens: `--vp-gold`, `--vp-win`, `--vp-loss`, `--vp-muted*` in `app/assets/css/main.css`; data in `'Fira Code'`.
- All currency in dollars, 5 coins always.

---

### Task 1: Strategy tables — the audited version

**Files:**
- Modify: `app/utils/strategyLookup.ts` (replace with the audited table; the diff is the commit)
- Test: `tests/strategyLookup.test.ts` (new `describe` blocks per variant)

**Interfaces:**
- Produces: unchanged `fastOptimalHold(cards, payTable?)`; new exports of the pattern finders used by Task 8: `findRoyal`, `find4ToSF`, `findFlushDraw`, `find4ToOutsideStraight`, `find3ToSF`, `findSuitedRanks`, `pickByRanks`, `indicesOfSubset`.

- [ ] **Step 1: Write the failing tests** — one `expectOptimal(payTableId, hand)` per overturned rule (the helper grades the table's hold against `analyzeHand` at runtime):

```ts
describe('Deuces Wild — exhaustive-audit rule classes', () => {
  it('discards A-3-4-5 outright: the missing 2 can only be a wild (4 outs, not 8)', () => {
    expectOptimal('deuces-wild-full', [c(3, 'spades'), c(4, 'spades'), c(8, 'spades'), c(5, 'hearts'), c(14, 'hearts')])
  })
  it('discards an ace-low 3 to a straight flush for the same reason', () => {
    expectOptimal('deuces-wild-full', [c(3, 'spades'), c(4, 'spades'), c(14, 'spades'), c(5, 'hearts'), c(8, 'hearts')])
  })
  it('holds the bare deuce over deuce + suited A-K', () => {
    expectOptimal('deuces-wild-full', [c(2, 'spades'), c(3, 'spades'), c(4, 'spades'), c(13, 'hearts'), c(14, 'hearts')])
  })
  it('redraws rather than hold a K-high suited royal pair', () => {
    expectOptimal('deuces-wild-full', [c(3, 'spades'), c(4, 'spades'), c(8, 'spades'), c(12, 'hearts'), c(13, 'hearts')])
  })
  it('plays 3-4-5-6 as an inside draw, so three suited connectors beat it', () => {
    expectOptimal('deuces-wild-full', [c(3, 'spades'), c(8, 'spades'), c(4, 'hearts'), c(5, 'hearts'), c(6, 'hearts')])
  })
  it('prefers an inside straight with two high cards over suited Q-T', () => {
    expectOptimal('deuces-wild-full', [c(3, 'spades'), c(8, 'spades'), c(11, 'spades'), c(10, 'hearts'), c(12, 'hearts')])
  })
  it('keeps a pat five of a kind with three deuces and a pair of tens', () => {
    expectOptimal('deuces-wild-full', [c(2, 'spades'), c(10, 'spades'), c(2, 'hearts'), c(10, 'hearts'), c(2, 'diamonds')])
  })
})
// Double Bonus 10/7, Double Double Bonus 9/6, Bonus Deluxe 8/6 and JoB 9/6 blocks follow the same shape (hands listed in the test file).
```

- [ ] **Step 2: Run** `pnpm vitest run --project statistical tests/strategyLookup.test.ts -t "exhaustive-audit"` — expected: every new test FAILS with "held [...] EV=… optimal [...] EV=…".
- [ ] **Step 3: Replace `app/utils/strategyLookup.ts`** with the audited table (rules: DW ace-low draws → discard, deuce + A-x suited → deuce, drop K-high 2-royal, 3-4-5-6 as inside, J-T > inside > Q-x; DB 3-flush-with-high family, ace alone, Q-J-T, royal-vs-pair and 4-flush-vs-pair by strength; two-pair-pays-1 games: inside straights over redraw / two high cards, ace over K-x, A-x-T royal → 4-flush, A-K-Q-J > suited Q-J; 2-3-4 suited is type 2). Export the pattern finders.
- [ ] **Step 4: Run** the same command — expected: PASS; then `pnpm test:fast` — PASS.
- [ ] **Step 5: Commit** `git commit -m "Close the strategy-table leaks found by the exhaustive exact-EV audit"`.

### Task 2: Exact-EV regression guard in the test suite

**Files:**
- Create: `tests/helpers/exactEv.ts` (sum-table engine: `buildTables(payTable)`, `evAllMasks(tables, sortedDeckIndices)`, `DECK`, `maskOf`)
- Create: `tests/strategyExactEv.test.ts` (statistical project)
- Modify: `vitest.config.ts` (add the new file to `STATISTICAL_SUITES`)

**Interfaces:**
- Produces: `buildTables(pt: PayTableDef): Tables`; `evAllMasks(t: Tables, dealt: number[], out?: Float64Array): Float64Array` where bit i of the mask ⇔ `dealt[i]` held; `N5 = 2598960`.

- [ ] **Step 1: Write the failing test** — the engine must agree with `analyzeHand` on random hands (fails with "buildTables is not a function" until the helper exists), and the table must lose ≤ 0.01 pp on a 200,000-deal seeded sample per pay table with no single hand losing more than 0.1 EV/coin:

```ts
it('agrees with the brute-force analyzer on every hold mask', () => { /* 3 hands × 10 tables, |Δ| < 1e-9 */ })
it('loses at most 0.01 pp of return to exact play on a 200k-deal sample', () => { /* per pay table */ })
it('reproduces the published return of every pay table to 0.005', () => { /* mean of best EV over the sample vs pt.returnPct */ })
```

- [ ] **Step 2: Run** — expected: FAIL (module missing).
- [ ] **Step 3: Port the engine** from the audit (binomial table, colex subset index, T0–T5 built from `classifyForPayTable` + `getPayForHand`, inclusion–exclusion per mask).
- [ ] **Step 4: Run** `pnpm vitest run --project statistical tests/strategyExactEv.test.ts` — PASS in ≈60 s.
- [ ] **Step 5: Commit** `git commit -m "Guard the strategy tables with an exact-EV sample audit"`.

### Task 3: Allocation-free classifier hot path

**Files:**
- Modify: `app/utils/handClassifier.ts` (rank histogram + rank bitmask, no per-call allocation), `app/utils/wildClassifier.ts` (same for the natural cards)
- Test: `tests/classifierIdentity.test.ts` (statistical project; reference implementations copied from today's `handShape`-based code)

- [ ] **Step 1: Write the failing test** — all 2,598,960 hands classify identically to the reference for all four classifier kinds, AND the four classifiers together finish the full deck in under 4 s (today ≈ 8–10 s on an M-series laptop; the bound is the RED assertion).
- [ ] **Step 2: Run** — expected: identity PASS, timing FAIL.
- [ ] **Step 3: Implement** `classifyHand` with a module-level `Int32Array(15)` histogram, a 13-bit rank mask, `STRAIGHT_MASKS` (ten windows incl. the wheel), and an inline suit check; `classifyDeucesWild` with the same primitives on the natural cards. `handShape` stays for the strategy tables, personas and hold descriptions.
- [ ] **Step 4: Run** — PASS both; `pnpm test:fast` PASS.
- [ ] **Step 5: Commit** `git commit -m "Make the classifier hot path allocation-free"`.

### Task 4: Game store — reconcile per hand, wager captured, denomination guarded, history uncapped, timeout-safe end

**Files:**
- Modify: `app/stores/game.ts`, `app/pages/index.vue` (denomination picker → `game.setDenomination(d)`), `app/components/training/TrainingHandHistoryList.vue` (render the latest 100)
- Test: `tests/gameStoreSession.test.ts`, `tests/gameStoreAsyncAnalysis.test.ts`

- [ ] **Step 1: Failing tests** (each RED against today's store):
  - `back-fills both hands when two hands are drawn before either analysis lands` (expects `totalMistakes === 2`, both history rows priced)
  - `prices a late back-fill at the wager the hand was played for` (denomination changes to 1.00 after the draw; expected cost 0.625, not 2.5)
  - `setDenomination after a completed hand starts a fresh session`
  - `keeps every completed hand in history past 500 hands` (play 501, expect `handHistory.length === 501`)
  - `finishing the hand after a mid-hand endSession refreshes the persona comparison`
- [ ] **Step 2: Run** `pnpm vitest run --project fast tests/gameStoreSession.test.ts` — all five FAIL.
- [ ] **Step 3: Implement**: `pendingDrawReconciles: Map<number, {playerHeldIndices, handNumber, wagerDollars}>`; `draw()` records `wagerDollars = coinsBet × denomination`; `reconcilePendingDraw` reads the map by token and prices with `wagerDollars`; `resetGame` clears the map; the rejection handler deletes its token; new `setDenomination(d)` (resets the session when a hand has been played or dealt); delete the history truncation; in the draw result callback `if (sessionEnded.value) endSession()`.
- [ ] **Step 4: Run** — PASS; whole fast project PASS.
- [ ] **Step 5: Commit** `git commit -m "Fix mistake-tracking races, guard the denomination, uncap history"`.

### Task 5: Analysis store — say why the simulation cannot run

**Files:**
- Modify: `app/stores/analysis.ts`, `app/pages/analysis.vue`
- Test: `tests/analysisStore.test.ts` (new)

- [ ] **Step 1: Failing test**: in the node environment (`typeof Worker === 'undefined'`), `startAnalysis()` leaves `status === 'idle'` and sets `unavailableReason` to a non-empty string.
- [ ] **Step 2: Run** — FAIL (`unavailableReason` undefined).
- [ ] **Step 3: Implement** `unavailableReason = ref<string | null>(null)`; set it in the guard and in a `try/catch` around `new Worker(...)`; the page renders it under the button and disables Run while it is set.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** with Task 6.

### Task 6: Display — net payouts, one sign convention, shared formatters

**Files:**
- Modify: `app/utils/format.ts` (add `formatHandNet(payout, coinsBet, denomination)`), `app/components/training/TrainingHandHistoryList.vue`, `app/pages/history.vue`, `app/components/BankrollPanel.vue`, `app/components/BankrollSparkline.vue`, `app/components/ResultDisplay.vue`, `app/components/training/TrainingResultBanner.vue`, `app/components/training/TrainingHandRecap.vue`, `app/stores/game.ts` (`creditsAsDollars`/`betAsDollars` via `formatDollars`)
- Test: `tests/format.test.ts` (new)

- [ ] **Step 1: Failing test**: `formatHandNet(5, 5, 0.25) === '+$0.00'`, `formatHandNet(0, 5, 0.25) === '-$1.25'`, `formatHandNet(20, 5, 0.25) === '+$3.75'`; `formatSignedDollars(-5, 0.25) === '-$1.25'`.
- [ ] **Step 2: Run** — FAIL (`formatHandNet` missing).
- [ ] **Step 3: Implement** and route every inline `(coins * denomination).toFixed(2)` through `formatDollars` / `formatSignedDollars` / `formatHandNet`.
- [ ] **Step 4: Run** `pnpm test:fast` — PASS.
- [ ] **Step 5: Commit** `git commit -m "Surface simulation failures, show net payouts, unify dollar formatting"`.

### Task 7: Components — sidebar persona rows, training-panel frame, hold-table label, footer

**Files:**
- Modify: `app/components/PersonaComparison.vue` (`compact` prop), `app/components/TrainingPanel.vue` (pass `compact`; restore frame/accent/base color), `app/components/HoldOptionsTable.vue` (`deltaLabel` prop; `limit !== undefined`), `app/components/AppFooter.vue` ("Home", omit the current page's own link, `AnalysisStatus` off the analysis page), `nuxt.config.ts` (`icon.clientBundle`)
- Test: `tests/holdOptionsTable.test.ts`, `tests/appFooter.test.ts` (happy-dom, stubs as in `tests/appHubLink.test.ts`)

- [ ] **Step 1: Failing tests**: `limit=0 renders no rows`; `deltaLabel="Δ Best" shows in the header`; footer on `/game` has no "Game" link and labels `/` "Home"; footer on `/analysis` renders no AnalysisStatus.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement**; set `icon: { clientBundle: { scan: true, sizeLimitKb: 256 } }` and confirm with `pnpm generate` that `.nuxt/nuxt-icon-client-bundle.mjs` contains `simple-icons:github`.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `git commit -m "Restore the sidebar fit, panel frame, hold-table label and footer conventions"`.

### Task 8: Personas — the real simple strategy, deuce-aware bots, honest labels

**Files:**
- Modify: `app/utils/botPersonas.ts`
- Test: `tests/botPersonas.test.ts`

- [ ] **Step 1: Failing tests**: Alice breaks a flush for four to a royal; Alice holds four to an outside straight over a lone high card; Alice holds the two lowest of three unsuited high cards; Alice holds three to a royal over a low pair; no recreational persona discards a deuce on Deuces Wild (a dealt wild royal stays pat).
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** Alice as the 16-line Wizard of Odds simple strategy using the exported pattern finders; union deuce indices into every non-Pat hold on `deucesWild` tables; set `expectedReturn` to the measured 9/6 values (Alice ≈99.4%, Gary ≈92.6%, Sam ≈35%) and fix the descriptions.
- [ ] **Step 4: Run** — PASS; re-measure with the exact engine (statistical test asserts Alice ≥ 99.3% on 9/6).
- [ ] **Step 5: Commit** `git commit -m "Make the personas honest: real simple strategy, deuce-aware, measured labels"`.

### Task 9: Docs and changelog

**Files:**
- Modify: `app/pages/analysis.vue` (Methodology numbers), `README.md` (persona table, penalty-card sentence, methodology table, testing section), `CHANGELOG.md`

- [ ] **Step 1:** Replace every pre-audit figure with the exhaustive numbers (table losses ≤ 0.006 pp; JoB 9/6 loses on 0.21% of deals at 0.006 EV/coin average).
- [ ] **Step 2:** `pnpm lint && pnpm typecheck && pnpm test && pnpm generate` — all green.
- [ ] **Step 3: Commit** `git commit -m "Document the exhaustive audit and its fixes"`, then `git push origin main`.
