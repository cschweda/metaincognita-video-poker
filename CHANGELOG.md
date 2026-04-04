# Changelog

All notable changes to the Video Poker Trainer will be documented in this file.

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
