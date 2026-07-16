# Changelog

All notable changes to the Video Poker Trainer will be documented in this file.

## [Unreleased]

### Resilience, Accessibility & Hardening Pass

A full-codebase audit (game logic, UI/accessibility, tests/tooling) turned into a four-part improvement pass. The core math needed no fixes — the audit confirmed the classifiers, EV calculator, payouts, and shuffle are correct.

#### Fixed

- **A worker hiccup no longer condemns the session to main-thread analysis.** One EV-worker timeout or error used to set a permanent failure flag; every later hand then ran the ~1-2s brute force on the main thread, freezing the deal animation. A failure now tears down only the broken worker and the next hand gets a fresh one; only repeated consecutive failures disable the worker path, and a successful response resets the count.
- **A failed analysis now says so instead of spinning forever.** The analysis promise had no rejection handler, so a worker crash left "Computing optimal play…" up indefinitely. The store now records an `analysisError`, the training panel shows an "Analysis unavailable" state (drawing still works), and the result verdict badge shows EVALUATING… / ANALYSIS UNAVAILABLE instead of claiming OPTIMAL PLAY before the analysis has actually landed — which also fixes the brief wrong verdict during speed-play races.
- **Session time no longer freezes at 0m.** `sessionElapsedMinutes` read `Date.now()` inside a computed with no reactive dependency, so it never updated; $/hr and hands/hr only refreshed when stats changed. The store now has a reactive clock ticked by the bankroll panel every 30s and on every completed hand.
- **Navigating home mid-animation can no longer corrupt the next session.** The deal/draw flip timers were never cancelled; a reset mid-draw let the pending timer classify a nulled hand and write a phantom hand (stats, wager, history row) into the fresh session. All animation timers are tracked and cleared on reset.
- **"No Win" is readable again.** The loss text rendered at 0.3 opacity (~1.5:1 contrast) — far below WCAG AA. Now a solid muted tone (≥4.5:1).

#### Accessibility

- **Contrast raised to WCAG AA across the app.** The muted blue-purple label family (~3.0:1 on the dark panels — including the actual pay-table payout numbers) is lifted to 5.2–6.9:1 via new design tokens; meaningful Tailwind `gray-500/600` labels and footer links move to `gray-400`; separators stay decorative-dim.
- **Design tokens.** New CSS custom properties (`--vp-gold`, `--vp-gold-bright`, `--vp-win`, `--vp-loss`, `--vp-muted`, `--vp-muted-strong`, `--vp-muted-dim`) replace ~80 hardcoded color literals across the machine components — retheming or future contrast fixes are now a one-file change.
- **The teaching tooltips work from the keyboard.** Every BankrollPanel stat row is now a focusable button (new `StatRow` component) and the sparkline dots are buttons with aria-labels (new `BankrollSparkline` component); previously the EV Lost / Return / $-per-hour definitions were hover-only.
- The analysis page's Hands-per-run / Runs selects have real labels; the landing-page variant cards gained a keyboard path (title button with `aria-pressed`); nav tabs, sub-tabs, and denomination buttons are raised toward 44px touch targets; each card's redundant HOLD button leaves the tab order (the card itself is the accessible toggle, halving tab stops); the rules modal no longer titles itself "undefined — Rules & Strategy" for an unknown variant.

#### Refactored

- **One implementation of the poker-shape primitives.** New `app/utils/handShape.ts` (ranks, rank counts, flush/straight/royal detection including the ace-low wheel) replaces five inline re-implementations across the classifiers, strategy tables, personas, and hold descriptions — the wheel check alone existed in four files. Verified unchanged by the exact-EV oracle suite and the 60k-hand tripwire.
- **EV enumeration is O(1) memory.** `forEachCombination` visits draws via a reused scratch array instead of materializing up to C(47,5) = 1.53M arrays (~100MB of transient allocations per analyzed hand); the final-hand buffer is reused per hold mask. strategyLookup's duplicate `choose` helper now delegates to the same enumerator.
- **TrainingPanel decomposed** from a 1,349-line five-phase monolith into a ~300-line phase-switch shell composing focused children (`training/TrainingOptimalPlay`, `TrainingCurrentSelection`, `TrainingResultBanner`, `TrainingHandRecap`, `TrainingSessionStats`, `TrainingHandHistoryList`), with the optimal-play teaching copy shared via `app/utils/optimalPlayText.ts`.
- **Duplicated UI unified:** the bot-comparison block (previously implemented twice, with triplicated return-tier thresholds) is one `PersonaComparison` component used by both the training panel and the history page; the ranked hold-options table (twice within TrainingPanel) is one `HoldOptionsTable`; the four copy-pasted page footers (one of which had already drifted) are one `AppFooter` using the bundled simple-icons GitHub glyph instead of four inline octocat SVGs. New `app/utils/format.ts` centralizes dollar/return-tier formatting.
- **Store hygiene:** the draw-before-analysis reconcile is keyed by analysis token instead of dealt-card ids (ids could collide across identical deals); `handHistory` is capped at 500 entries (persona replay still sees every completed hand); the history page's profit-trend bars no longer recompute the max per bar (was O(n²) per render); the analysis store degrades with a message instead of throwing when Web Workers are unavailable. Dead CSS (`.tp-comparison`, `.tp-play-*`, `.bp-credits`) and the unused single-run simulation branch are gone.

#### Testing & CI

- **New `tests/handClassifier.test.ts` (39 tests)** — the standard/Bonus/DDB classifiers finally have direct tests: straight/wheel/broadway boundaries (including A-3-4-5-6 and wraparound rejections), the jacks-or-better pair boundary, every quad rank-group and DDB kicker boundary (Four Aces + 2-4 vs + 5-K, Four 2s-4s + A-4 vs + 5-K), and a classifier↔pay-table row-name integrity check (a renamed row would silently zero payouts).
- **Seedable RNG.** `shuffle()` now accepts an injectable rand-int source (crypto rejection sampling remains the game-path default). New `app/utils/prng.ts` (xorshift32) is shared by the strategy tripwire tests and the simulation worker — simulations are reproducible when seeded and much faster (no more ~1M `crypto.getRandomValues` calls per batch).
- **Fast/statistical test split.** Vitest projects: `pnpm test:fast` runs everything but the two statistical suites in ~2s; `pnpm test` still runs all. Coverage now scoped to `app/**`.
- **Deploys are gated.** The Netlify build command now runs lint + typecheck + fast tests before `generate` — a red check can no longer deploy. GitHub CI also triggers on pull requests, and still runs the full statistical suite.
- Worker-recovery tests added to `tests/evAnalysisClient.test.ts`; analysis-failure and timer-cancellation tests added to the store suites.

#### Docs

- README: removed the stale "saves a session snapshot to localStorage" claim (that code was removed in the strategy-rewrite cleanup); documented the fast/statistical split and deploy gating.
- ADR-01 rewritten (the project uses pnpm, not Yarn); ADR-06 amended (two stores: game + analysis, with the boundary rationale); ADR-07 superseded (strategy tables are TypeScript graded against exact EV, not runtime JSON).
- Social embeds fixed: `og:image`/`twitter:card` meta now point at the hero image; title/description consolidated into `useSeoMeta`.

### The Hub Exit

#### Added

- **The hub exit — a way back to the floor.** A gold **METAINCOGNITA** wordmark now sits at the far left of the top status bar on every route, linking to [metaincognita.com](https://metaincognita.com) — the floor where all nine Metaincognita games live. Until now the hub linked out to every game and not one of them linked home; a player deep in a session had no way back but the browser's back button. It is a real `<a href>`, opens in the **same tab** (an exit, not a side trip), is never hidden or gated, and **never confirms** — it destroys nothing, and the point is that you can always leave. Suite chrome, per METAINCOGNITA-GUIDELINES v1.2 §5.

### Strategy Table Rewrite & Session Fixes

#### Fixed
- **The fast strategy tables (`strategyLookup.ts`) were rewritten from scratch and are now graded against the exact EV calculator in the test suite.** The old tables broke made pat hands in Deuces Wild (a dealt wild royal was played as a 4-card royal draw — EV 4.32 vs 25.0; pat straight flushes, straights and flushes with a deuce were similarly broken), held the junk kicker with quads, held one of the pair when trying to keep five of a kind with 3 deuces, held a single high card instead of two, over-ranked inside straights above 3-to-a-straight-flush, and held 3-flushes that a full redraw beats. Measured by 500k-hand simulation, Deuces Wild played at 94.4% instead of ~100.8%, DDB at 95.3% instead of ~99.0%. After the rewrite, exact-EV grading over random hands shows 0 mistakes in 200 hands for 9/6 JoB and 8/5 Bonus, ≤0.03% of bet mean EV loss for Deuces Wild, DDB and Bonus Deluxe, and ~0.2% for 10/7 Double Bonus (documented on the Analysis page).
- **Exact EV corrected two pieces of published-strategy lore the app repeated.** With three aces in 9/6 DDB the optimal play is the aces *alone* — never a bare 2-4 kicker (12.49 vs 11.83 EV; the old table and the rules text both held the kicker), and aces are held even out of a full house. With 3 deuces in full-pay Deuces Wild, breaking a pat five of a kind for the bare deuces is exactly optimal (15.06 vs 15.00). Rules text, README and strategy tables all updated.
- **Double Bonus 10/7 now has its own strategy adjustments** (all verified against exact EV): 4-to-a-flush and 3-to-a-royal outrank a non-ace high pair, a 4-card outside straight outranks a low pair, inside straights with a high card outrank unsuited high-card holds, trip aces break a full house, and inside straights are held over a full redraw.
- **Session-state fixes in the game store:** INSERT CREDITS now adds 100 credits without wiping stats/history (it previously nuked the session but kept the replay decks, corrupting the bot comparison); End Session excludes a hand that was dealt but never drawn, and dealing again after End Session resumes the session cleanly; a late-arriving analysis now back-fills mistake tracking even if the next hand was already dealt (previously the mistake was silently lost); persona replay scores each hand under the pay table it was dealt on.
- **Keyboard fix:** Enter/Space no longer hijack focus from buttons, links, selects and modal controls on the game page — previously Enter on the variant tabs or a confirmation dialog dealt a hand instead of activating the control.
- Analysis page hand-frequency percentages now divide by each run's actual hand count instead of the current dropdown selection.
- The shuffle now uses rejection sampling on top of `crypto.getRandomValues`, removing the (already negligible, ~1e-8) modulo bias.
- The EV analysis worker has a 15s watchdog: a hung worker fails over to main-thread analysis instead of leaving the hand unanalyzed.
- The HELD badge now rises with the held card (same 10px translate and timing), so the raised card no longer overlaps the bottom of the label; the badge slide respects `prefers-reduced-motion`.

#### Removed / Consolidated
- Six duplicate classifier dispatchers consolidated into `app/utils/classify.ts`.
- Dead code removed: the unused synchronous and async simulators (`simulator.ts`, `simulatorAsync.ts`), the unused bet actions (`betMax`/`incrementBet`/`setCoinsBet`), the never-read localStorage save/load cycle, the unreachable max-coins pay-table warning, and the unused `jokerPoker` classifier tag.

#### Testing
- New `tests/strategyLookup.test.ts`: 41 tests grading every strategy rule class against the exact EV calculator at runtime (no hard-coded expectations), plus a seeded random-hand smoke test and a deterministic 60k-hand-per-variant return tripwire.
- New `tests/gameStoreSession.test.ts`: session lifecycle coverage (additive credits, End Session exclusions and resume, late-analysis reconciliation).
- Worker-watchdog fallback test in `tests/evAnalysisClient.test.ts`.

## [0.3.0] - 2026-06-09

### Correctness, Performance & Testing

#### Fixed
- **Deuces Wild classifier paid impossible ace-low straights.** A-3-4-5-6 was classified as a Straight, and suited A-4-5-6 + deuce as a Straight Flush (9x overpay). The wheel A-2-3-4-5 requires a wild for the 2 slot, since every 2 in Deuces Wild is wild. This affected real game payouts, the EV trainer's recommendations, and simulation results.
- **Perfect Pat is now actually optimal.** The game store records the brute-force optimal hold for every dealt hand (`optimalHeld` on the replay deck), and the session-end persona replay uses those exact holds. Previously Pat used the condensed strategy table, which made measurable errors (e.g. holding a 4-card inside straight over a lone high card, EV 0.3404 vs 0.4724; standing pat on quads-with-junk in Deuces Wild instead of drawing for Five of a Kind, EV 5.00 vs 5.85).
- Template type fixes surfaced by Vue 3.5.35: the setup page's PLAY button passed its MouseEvent as a pay-table id; card hold/face-down props could receive `undefined`.

#### Performance
- **Per-hand EV analysis moved to a Web Worker** (`app/utils/evWorker.ts` + `evAnalysisClient.ts`). The exhaustive 32-hold evaluation (~2.6M draw classifications, ~1.7s) previously ran on the main thread inside a `setTimeout(0)`, freezing the deal animation on every hand. The client falls back to synchronous analysis when Workers are unavailable (tests, worker failure).
- Draw-before-analysis race handled: if the player draws before the worker responds, the result records immediately and mistake stats/history back-fill on arrival; stale analyses are dropped after deals/resets via a token guard.

#### Testing & CI
- vitest suite — 39 tests across 6 files: statistical shuffle validation (chi-squared positional uniformity at 50k shuffles, suit-deal fairness, adjacent-card independence, first-card uniformity), Deuces Wild classifier including all ace-low wheel edge cases, persona replay (exact-optimal Pat, fallback, non-Pat independence), store async-analysis flows (normal, race reconcile, stale-drop)
- `pnpm test`, `test:watch`, `test:coverage` scripts; `vue` added as a direct devDependency so store tests resolve under pnpm
- CI pipeline extended from lint + typecheck to lint + typecheck + **test + build** (`pnpm generate`)

#### UI
- **Game page is now responsive.** Below 1100px the three columns stack vertically with the machine first; sidebars expand to full width (max 740px) and sticky positioning is disabled. Previously the fixed 280px sidebars forced ~1330px minimum width.
- History page lists hands chronologically (oldest first) in the Hands tab

#### Tooling & Housekeeping
- `start-dev-server.sh` — kills stray dev servers and port-3000 listeners, clears `.nuxt`/`.output`/`dist`/vite caches, starts `pnpm dev` (`--clean-only` to skip the start)
- Repo-wide lint cleanup (stylistic auto-fixes plus manual: unused vars, `any` casts in history page now typed as `Card`); `docs/` excluded from linting as reference artifacts
- `Machine.vue` renamed to `GameMachine.vue` (vue/multi-word-component-names)

---

## [0.2.0] - 2026-04-03

### UI Unification & Design System

#### Metaincognita Branded Background
- Standardized og:image background for all simulators in the collection
- 5-layer technical graph-paper aesthetic: fine grid, major grid, dot overlay, radial vignette, base gradient
- Corner registration marks (engineering drawing feel)
- Bottom branding line with "METAINCOGNITA" letterspaced wordmark
- Per-game accent bar (gold for VP, green for Hold'em, etc.)
- Full specification and SVG defs documented in design-system.md

#### Design System Document
- `docs/design-system.md`: comprehensive UI specification for the simulator collection
- Shared color palette, typography scale, layout patterns
- Per-game accent colors (Hold'em green, VP amber, Craps red, Blackjack emerald, Roulette rose, Slots purple)
- Component patterns with exact Tailwind classes
- Game area vs chrome separation principle
- Hero image creation guide with SVG defs and PNG conversion

#### UI Improvements
- Game page header info bar (NLH pattern): back button, hand #, variant, phase, balance, history link
- UTooltip on all bankroll panel metrics with contextual explanations
- Training panel converted from light to dark theme (matches NLH stats panel)
- Interactive sparkline dots with hover tooltips (hand #, result, +/- dollars, balance)
- "View Bot Comparison" scroll link replaces "training panel" jargon
- Hand history shows all hands with held cards and +/- dollars (not just mistakes)
- Variant switch confirmation modal when mid-session
- Sub-tab reserved height slot (no layout shift)
- Rules modal: strategy differences section, complexity rating, JoB pay table variants
- Wild card highlighting (green glow + WILD label on deuces)
- All currency in dollars (no credits anywhere)

---

## [0.1.0] - 2026-04-03

### Initial Build

#### Core Engine
- 52-card deck with cryptographic shuffle (`crypto.getRandomValues` + Fisher-Yates)
- Hand classifiers for standard poker (9 categories), Bonus Poker (rank-differentiated quads), Double Double Bonus (kicker-aware quads), and Deuces Wild (wild-card-aware, 10+ hand types)
- Brute-force 32-option EV calculator: evaluates every possible draw outcome exhaustively for mathematically exact expected values
- Pay table system with 8 configurable tables across 6 variants

#### Game Variants
- **Jacks or Better** — 5 pay tables (9/6, 8/6, 8/5, 7/5, 6/5)
- **Bonus Poker** — 8/5 full-pay (99.17%)
- **Bonus Poker Deluxe** — 8/6 (98.49%)
- **Double Bonus** — 10/7 full-pay (100.17%, player advantage)
- **Double Double Bonus** — 9/6 (98.98%, kicker-aware)
- **Deuces Wild** — Full-pay (100.76%, wild-card-aware classifier)

#### Machine UI
- Casino-realistic video poker cabinet aesthetic (dark chrome, gold accents, CRT-era feel)
- Pure CSS + inline SVG card rendering (no external images)
- 4-color suit system for accessibility (spades black, hearts red, diamonds blue, clubs green)
- Burgundy card backs with gold diamond lattice inlay
- 3D card flip animations with staggered dealing
- Both card-click and dedicated HOLD/CANCEL button interaction
- Casino-style raised HOLD buttons with press-down effect
- Pay table display with active column highlight and winning row animation
- LED-green credit readout with monospace font
- BET ONE (cycles 1-5), BET MAX (sets 5 + auto-deals)
- Max coin warning when not betting 5 coins

#### Training Panel (Real-Time Analysis)
- Exact optimal play recommendation with human-readable description ("Hold the pair of 7s")
- Explanation of WHY the play is optimal (outcome probabilities, win %, comparison to next-best option)
- Live outcome distribution that updates as player toggles holds — shows exact draw probabilities for each hand type with visual bars
- Current selection EV vs optimal EV with green/red indicator
- Top 5 hold options ranked by EV during hold phase
- HAND OVER result banner (win amount or loss)
- Step-by-step hand recap: dealt cards → your holds → optimal holds → final hand → result
- OPTIMAL PLAY / MISTAKE verdict with cost of mistake in dollars
- Expandable all-32-options ranked list (post-draw)
- Session stats: hands played, mistakes, EV lost, effective return %
- Scrollable hand history with per-hand mistake highlighting
- Computing spinner during EV analysis

#### Bankroll Panel
- Live bankroll in dollars and credits
- Current bet and denomination display
- Session stats: hands, wins, wagered, returned, net +/-, return %
- Mistake tracking: count and total EV lost
- Last hand result with OPTIMAL/MISTAKE indicator
- Pace stats: hands/hour, $/hour effective rate, session elapsed time
- End Session button (triggers persona comparison)

#### Bot Persona Comparison
- **Perfect Pat** — mathematically optimal strategy (benchmark)
- **Almost Alice** — simplified strategy (~99.4% return)
- **Gut-Feel Gary** — common recreational mistakes: holds kickers, prefers aces over low pairs (~96-97%)
- **Superstitious Sam** — pattern-chasing, effectively random (~94-95%)
- End Session replays all dealt hands through each persona
- Side-by-side return % and net credit comparison
- "The gap between you and Pat is the dollar value of your mistakes"

#### Statistical Analysis Page
- Simulation runner with Web Worker (non-blocking UI)
- Configurable: 500-10,000 hands per run, 1-5 runs per variant
- Runs all 6 variants with strategy lookup (fast pattern matching, not brute-force)
- Per-variant metrics: theoretical vs actual return, deviation, range, avg time
- Per-run table: return, delta, wagered, returned, net, timing
- Expandable hand frequency tables
- Downloadable full report as text file
- Progress bar with percentage and variant/run indicator
- Analysis status indicator in footer across all pages (amber = running, green = done)
- Methodology & Caveats section documenting what's exact vs approximate

#### Variant-Specific Strategy Tables
- Jacks or Better: full ~30-entry strategy matching Wizard of Odds / Ethier Table 17.5
- Bonus Poker: JoB base with Ace-preferring adjustments
- Double Double Bonus: kicker-aware holds (2/3/4 alongside three Aces)
- Deuces Wild: proper 5-branch strategy organized by deuce count (0-4)

#### Rules & Education
- Rules modal (Nuxt UI UModal) for each variant with: overview, quick facts, hand rankings with payouts, strategy notes, pay table tips
- Variant descriptions on setup page
- Pay table flash animation when switching variants

#### Session Management
- localStorage persistence (survives page refresh, browser close)
- 5-minute inactivity timeout (auto-ends session, triggers persona comparison)
- Tab close saves session via `beforeunload`
- Tab switch saves session via `visibilitychange`
- Session restore on page load

#### Setup Page
- 3-column variant card grid with Play Now and Rules buttons per variant
- Pay table sub-selection for variants with multiple tables
- Selected variant summary with return %, deck type, minimum paying hand
- Denomination selector ($0.25, $0.50, $1.00)

#### Accessibility
- `aria-pressed` on hold toggle buttons
- `aria-label` on cards (rank and suit announced)
- `aria-live` result display
- Keyboard navigation: arrow keys between cards, Space/Enter for deal/draw
- Semantic pay table with proper `<th>` headers
- `prefers-reduced-motion` support (all animations skippable)
- 4-color suits (not reliant on color alone)
- Focus-visible indicators on all interactive elements

#### Architecture
- Nuxt 4.4 + Nuxt UI 4.6 + Pinia + TypeScript
- SPA mode (`ssr: false`)
- Three-column game layout: bankroll (left) | machine (center) | training (right)
- Equal-width sidebars for visual symmetry
- Consistent dark theme matching the NLH Hold'em simulator aesthetic
- Footer nav with status indicators across all pages

#### Deployment & Security
- Netlify static SPA deployment (`pnpm generate` → `.output/public`)
- SPA catch-all redirect for client-side routing
- Hardened security headers:
  - CSP: `default-src 'none'`, no `unsafe-eval`, explicit whitelist only
  - HSTS: 2-year max-age with `includeSubDomains` and `preload`
  - Cross-origin isolation: COOP `same-origin`, COEP `credentialless`, CORP `same-origin`
  - `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`
  - `Permissions-Policy` blocking all unused browser APIs
  - `form-action: none`, `base-uri: self`, `upgrade-insecure-requests`
  - Web Worker support via `worker-src 'self' blob:`
- Immutable cache headers for hashed static assets (1-year, `/_nuxt/*`)
