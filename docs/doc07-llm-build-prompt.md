# Doc 07 — LLM Build Prompt

> **Purpose:** Self-contained prompt fed to Claude for each phase build. Includes tech stack, architecture rules, file structure, security requirements, environment, and testing checklist. Each phase build session starts with this document plus the relevant phase document (Doc 01–05).

---

## Project Identity

**Video Poker Simulator** — A browser-based video poker training tool that teaches optimal play through real-time EV analysis, mistake tracking, and mathematical validation.

---

## Tech Stack (Non-Negotiable)

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Nuxt | 4.4+ |
| UI Library | Nuxt UI | v4+ |
| State Management | Pinia | Latest |
| Package Manager | Yarn | 1.22.22 |
| Language | TypeScript | Strict mode |
| Deployment | Netlify | Static (ssr: false) |
| Testing | Vitest | Latest |

**Do not substitute any of these.** Do not use npm or pnpm. Do not use Vue Router directly (Nuxt handles routing). Do not add UI libraries beyond Nuxt UI (no Vuetify, no Tailwind plugins, no shadcn). Do not add a backend or database.

---

## Architecture Rules

### Application Mode

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  ssr: false,  // Client-side SPA only. No SSR, no SSG.
  // ...
})
```

This is a client-side SPA. No server-side rendering. No serverless functions. No API routes.

### Routing

Two routes only:

- `/` — Setup page (variant selection, configuration)
- `/game` — The video poker machine

Use Nuxt's file-based routing (`pages/index.vue`, `pages/game.vue`). Do not add additional routes without explicit instruction.

### State Management

Single Pinia store (`stores/game.ts`). All game state lives here: credits, current hand, session statistics, hand history, settings. Components read from the store; composables write to it.

Do not create multiple stores. Do not use component-level state for anything that needs to persist across the deal/draw cycle.

### Composables

All game logic lives in composables (`composables/`), not in components. Components are presentation only — they render state and emit events. The composable layer handles:

- `useCardEngine.ts` — Deck creation, shuffle, deal, draw
- `useHandEvaluator.ts` — 5-card hand classification (standard)
- `useWildEvaluator.ts` — Wild-card-aware classification (Phase 5)
- `useEVCalculator.ts` — Brute-force 32-option EV analysis
- `useStrategy.ts` — Ranked strategy lookup per variant
- `usePayTable.ts` — Pay table definitions, payout lookup, theoretical return
- `useBots.ts` — Bot strategy functions and session replay
- `useHandHistory.ts` — Session hand log

### Utils

Pure functions with no side effects live in `utils/`:

- `cards.ts` — Card type definitions, deck generation
- `combinations.ts` — C(n,k) enumeration for draw outcomes
- `handClassifier.ts` — Low-level hand classification logic

### Component Hierarchy

```
Machine.vue
├── PayTableDisplay.vue
├── CardHand.vue (5 cards with hold toggles)
├── TrainingPanel.vue
│   └── HandHistory.vue
├── ControlBar.vue
└── SessionStats.vue
```

### RNG

**Always use `crypto.getRandomValues()` for randomness.** Never use `Math.random()`. See Doc 06 for the Fisher-Yates implementation.

### TypeScript

Strict mode. No `any` types except where genuinely unavoidable (and commented). All function signatures typed. All interfaces defined in relevant files (not a global types file unless shared across 3+ files).

---

## File Structure

```
video-poker-simulator/
├── app/
│   ├── app.vue
│   ├── pages/
│   │   ├── index.vue
│   │   └── game.vue
│   ├── components/
│   │   ├── Machine.vue
│   │   ├── PayTableDisplay.vue
│   │   ├── CardHand.vue
│   │   ├── TrainingPanel.vue
│   │   ├── HandHistory.vue
│   │   ├── ControlBar.vue
│   │   ├── SessionStats.vue
│   │   ├── BotComparison.vue
│   │   ├── ConvergenceViewer.vue
│   │   ├── PayTableLiteracy.vue
│   │   ├── MachineScout.vue
│   │   └── HandCategoryTrainer.vue
│   ├── composables/
│   │   ├── useCardEngine.ts
│   │   ├── useHandEvaluator.ts
│   │   ├── useWildEvaluator.ts
│   │   ├── useEVCalculator.ts
│   │   ├── useStrategy.ts
│   │   ├── usePayTable.ts
│   │   ├── useBots.ts
│   │   └── useHandHistory.ts
│   ├── stores/
│   │   └── game.ts
│   └── utils/
│       ├── cards.ts
│       ├── combinations.ts
│       └── handClassifier.ts
├── docs/
│   └── (13 design documents)
├── tests/
│   ├── hand-evaluator.test.ts
│   ├── wild-evaluator.test.ts
│   ├── ev-calculator.test.ts
│   ├── strategy-parity.test.ts
│   ├── return-convergence.test.ts
│   └── hand-frequency.test.ts
├── nuxt.config.ts
├── package.json
├── netlify.toml
└── yarn.lock
```

Do not reorganize this structure. New files go in the appropriate existing directory. If a phase requires a new file, place it per the pattern above.

---

## Key Interfaces

These are the core data types. Use them consistently across all phases.

```typescript
// --- Card types ---
type Rank = 0 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14
// 0 = Joker (Phase 5 only), 2-10 = pip cards, 11=J, 12=Q, 13=K, 14=A

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker'

interface Card {
  rank: Rank
  suit: Suit
  id: string       // unique, e.g. '14s' for Ace of Spades, 'joker' for Joker
}

// --- Pay table ---
interface PayTable {
  id: string
  variant: string
  shortName: string
  theoreticalReturn: number
  handPayouts: Record<string, number>
  maxCoinBonus: { hand: string; standardPay: number; maxCoinPay: number }
  deckSize: 52 | 53
  wildCards: 'none' | 'deuces' | 'joker'
  minimumPayHand: string      // e.g. 'jacksOrBetter', 'kingsOrBetter'
}

// --- Hand result ---
interface HandResult {
  category: string
  label: string
  payout: number
  cards: Card[]
  winningCards?: number[]
  fourOfAKindRank?: Rank
  kickerRank?: Rank
  wildCount?: number
}

// --- EV analysis (variant-agnostic) ---
interface HoldAnalysis {
  heldIndices: number[]
  heldCards: Card[]
  expectedValue: number
  handDistribution: Record<string, number>
}

// --- Hand history ---
interface HandHistoryEntry {
  handNumber: number
  dealtCards: Card[]
  playerHeld: number[]
  optimalHeld: number[]
  drawnCards: Card[]
  resultCategory: string
  resultLabel: string
  payout: number
  playerEV: number
  optimalEV: number
  mistakeCost: number
  coinsBet: number
  denomination: number
  timestamp: number
}
```

---

## Accessibility Requirements (Every Phase)

- All interactive elements keyboard-accessible
- All card displays announce rank and suit to screen readers
- Hold toggles use `aria-pressed`
- Results announced via `aria-live` regions
- Pay table is semantic `<table>` with `<th>` headers
- Color is never the sole indicator (suits use shape + color)
- Contrast ratio ≥ 4.5:1 on all text
- Animations respect `prefers-reduced-motion`
- axe-core: zero violations at the end of every phase

---

## Security Requirements

- Shuffle: `crypto.getRandomValues()` only. Never `Math.random()`.
- No external script tags. All JS bundled at build time.
- CSP headers in `netlify.toml` (see Doc 06).
- No PII collected or stored.
- `yarn audit` clean of critical/high issues.

---

## Testing Requirements

Every phase ships with tests. Use Vitest. Test files go in `tests/`.

**Minimum coverage per phase:**
- All hand classifier categories have at least 3 test cases each
- All pay table payout lookups verified against published values
- EV calculator spot-checked against known hands
- No accessibility violations (axe-core)

Run tests with: `yarn test`

---

## Netlify Deployment

```toml
# netlify.toml
[build]
  command = "yarn generate"
  publish = ".output/public"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; form-action 'none';"
```

---

## Phase Build Instructions

When building a specific phase, you will receive:

1. **This document** (Doc 07) — for stack, architecture, and rules
2. **The phase document** (Doc 01, 02, 03, 04, or 05) — for phase-specific deliverables

Build only what the phase document specifies. Do not build ahead. Each phase produces a testable increment — the machine should be fully functional (for the features built so far) at the end of every phase.

If a phase document references an interface or behavior from a previous phase, assume it exists and works correctly. Do not rebuild previous phase work unless fixing a bug.

**Commit message format:** `Phase N: [brief description]`
