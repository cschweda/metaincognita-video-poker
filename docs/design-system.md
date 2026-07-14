# Metaincognita Simulator Collection — UI Design System

> **Purpose:** Codify the shared visual language across all casino simulators (Hold'em, Video Poker, Craps, Blackjack, Roulette, Slots) so each game looks like part of the same family despite different gameplay mechanics.
>
> **Principle:** The *chrome* (UI shell, stats, navigation, analysis) is identical across all simulators. The *game area* (table, machine, board) is custom per game. Players should feel at home navigating any simulator in the collection.
>
> **Revision:** 2026-07-14 — adds the top status bar, the hub exit, and the viewport-ownership rule they force (*Layout Patterns*). A copy of this document without those sections is stale.

---

## Stack (Shared)

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Nuxt 4 | 4.4+ |
| UI Library | Nuxt UI | 4.5+ |
| CSS | Tailwind CSS | 4.x |
| State | Pinia | 3.x |
| Language | TypeScript | Throughout |
| Package Manager | pnpm | 10.x |
| Deploy | Netlify | Static SPA |
| Fonts | Fira Code (mono), system-ui (prose) | Via @nuxt/fonts |

---

## Color Palette

### Global (All Simulators)

```css
/* Base */
--bg-page:          bg-gray-950           /* #030712 — all page backgrounds */
--bg-card:          bg-gray-900/60        /* stats cards, panels */
--bg-card-hover:    bg-gray-800/60        /* hover state */
--border-card:      border-gray-800/60    /* card borders */
--border-section:   border-gray-800       /* section dividers, tab bars */
--border-subtle:    border-gray-700/50    /* footers, light dividers */

/* Text */
--text-primary:     text-white            /* headlines, key values */
--text-secondary:   text-gray-400         /* descriptions, labels */
--text-muted:       text-gray-500         /* timestamps, hints */
--text-dimmed:      text-gray-600         /* footnotes, disabled */

/* Semantic */
--text-win:         text-green-400        /* #4ade80 — wins, positive values */
--text-loss:        text-red-400          /* #f87171 — losses, mistakes */
--text-warn:        text-amber-400        /* #fbbf24 — warnings, variance */
--text-info:        text-blue-400         /* #60a5fa — info, links */

/* Metric label pattern */
--label:            text-[0.65rem] text-gray-500 uppercase tracking-wider
```

### Per-Game Accent Colors

Each simulator has ONE accent color used for the primary `UButton`, active tab highlights, and game-specific chrome. This differentiates the games while keeping the chrome identical.

| Simulator | Accent | Nuxt UI `primary` | Usage |
|-----------|--------|-------------------|-------|
| Hold'em | Green | `green` | Table felt, chip stacks, action buttons |
| Video Poker | Amber/Gold | `amber` | Machine chrome, gold trim, HELD badges |
| Craps | Red | `red` | Table layout, dice, come/don't come |
| Blackjack | Emerald | `emerald` | Table felt, card shoe, insurance indicator |
| Roulette | Rose | `rose` | Wheel, red numbers, betting grid |
| Slots | Purple | `purple` | Reel highlights, bonus triggers |

Set in `app.config.ts`:
```ts
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'amber', // ← change per game
      neutral: 'slate'
    }
  }
})
```

---

## Typography

```css
/* Numbers, data, code, machine elements */
font-family: 'Fira Code', 'SF Mono', 'JetBrains Mono', monospace;

/* Prose, descriptions, tooltips */
font-family: system-ui, -apple-system, sans-serif;
```

### Scale

| Use | Class | Example |
|-----|-------|---------|
| Page title | `text-3xl font-bold text-white` | "Video Poker Trainer" |
| Section title | `text-2xl font-bold text-white` | "Session History" |
| Card heading | `text-xl font-bold text-white` | "Jacks or Better" |
| Metric label | `text-[0.65rem] text-gray-500 uppercase tracking-wider` | "WAGERED" |
| Metric value | `text-2xl font-bold font-mono` | "$23.75" |
| Large metric | `text-4xl font-bold font-mono` | "+$12.50" |
| Body text | `text-sm text-gray-400` | Descriptions |
| Small text | `text-xs text-gray-500` | Timestamps, footnotes |
| Tiny text | `text-[0.6rem] text-gray-600` | Position labels |

---

## Layout Patterns

### App Shell

A shared layout wraps every route. `app.vue` wraps `NuxtPage` in `NuxtLayout`, so no page can opt out of the chrome:

```html
<!-- app/app.vue -->
<UApp>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</UApp>
```

```html
<!-- app/layouts/default.vue -->
<div class="h-screen flex flex-col bg-gray-950 text-white">
  <nav
    aria-label="App"
    class="h-9 shrink-0 flex items-center gap-2 px-3 bg-gray-900 border-b border-gray-800"
  >
    <AppHubLink />
    <span
      class="h-4 w-px bg-gray-800"
      aria-hidden="true"
    />
    <span class="text-xs text-gray-400">
      <span class="text-primary-400">Video Poker</span> Trainer
    </span>
  </nav>

  <main class="flex-1 min-h-0 overflow-y-auto">
    <slot />
  </main>
</div>
```

The shell is `h-screen` and `<main>` is the scroll container (`flex-1 min-h-0 overflow-y-auto`). **The shell owns the viewport; pages do not** — see *Viewport Ownership*.

### Top Status Bar

The slim bar across the top of every route. Chrome in the strict sense: not merely the same style in every simulator, the same markup.

| Slot | Content | Classes |
|------|---------|---------|
| Far left | Hub exit — `<AppHubLink />` | (see below) |
| Divider | Decorative hairline | `h-4 w-px bg-gray-800` + `aria-hidden="true"` |
| Title | App name, the game word in the accent | `text-xs text-gray-400`, game word `text-primary-400` |

- **Element:** `<nav aria-label="App">` — a landmark, not a bare `<div>`.
- **Height: 37px** — `h-9` (36px) plus the 1px `border-b`. Memorize this number; every `calc(100vh - …)` in the app has to subtract it.
- `shrink-0` — the bar never compresses under a tall page.
- `bg-gray-900` on the `bg-gray-950` shell, divided by `border-b border-gray-800`. The bar reads as chrome sitting *above* the page, not as part of it.
- The title is the **only** place the per-game accent appears in the bar (`text-primary-400`). The hub exit beside it deliberately does not follow the accent.

The hub exit is the bar's **first child**. Any further top chrome a simulator needs (a back/leave control, a session stat) follows it, after the divider.

### The Hub Exit (`AppHubLink`)

The gold `METAINCOGNITA` wordmark, pinned far left of the status bar on every route. It leaves the app for the hub at `https://metaincognita.com`, the floor every simulator hangs off. Copy `app/components/AppHubLink.vue` **verbatim, classes included** — it is byte-identical in slots, and that is the point:

```html
<a
  href="https://metaincognita.com"
  aria-label="METAINCOGNITA — exit the simulator, back to all the games"
  data-test="hub-link"
  class="flex items-center gap-1.5 rounded border border-amber-500/30 bg-amber-500/5 px-2 py-0.5 text-amber-400 transition-colors hover:border-amber-400/60 hover:bg-amber-500/10 hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
>
  <UIcon
    name="i-lucide-log-out"
    class="w-3.5 h-3.5"
    aria-hidden="true"
  />
  <span class="text-[10px] font-semibold tracking-[0.12em]">METAINCOGNITA</span>
</a>
```

Every rule below is load-bearing, not stylistic:

| Rule | Why |
|------|-----|
| A real `<a href>` — never `NuxtLink`, never a router push | It leaves the SPA. A router push stays inside it. |
| Same tab — **no `target`** | This is an *exit*, not a side trip. A new tab leaves the simulator running behind it. (The footer's GitHub link is the opposite case: it *is* a side trip, and keeps `target="_blank" rel="noopener"`.) |
| On **every route**, the app's own index included | Never gated behind a `v-if`, never hidden, never collapsed into a menu. Prominence is the point. |
| It **never confirms** | It destroys nothing. Do not confuse it with the in-page "Home"/leave control, which goes to *this app's* setup page and keeps whatever confirm it already had. The hub exit is not a leave; it is the door. |
| It stays **gold** | The `amber-*` classes are literal — never `primary-*`. This app's accent happens to be amber; the hub exit must not follow it if that ever changes. Suite chrome, not game chrome: a player learns it once and finds it everywhere. |
| The `aria-label` **contains the visible wordmark verbatim** | WCAG 2.5.3 Label in Name. "Meta Incognita — exit the simulator" reads fine to a human and **fails**, on the space. |

Guarded by `tests/appHubLink.test.ts` (real anchor, no `target`, gold and not `primary`, accessible name contains the label) and `tests/defaultLayout.test.ts` (present on every route, first child of the bar, no page overrides the layout, `app.vue` still wraps in `NuxtLayout`).

### Viewport Ownership

**The shell owns the viewport. Pages size to the shell, not the window.** This is the trap for any repo adopting the bar, and it will hit every page at once.

Before the bar, every page sized itself to the viewport (`min-h-screen`, `min-height: 100vh`). Put a 37px bar above a page that is already 100vh tall and the document becomes 100vh + 37px: **every route is permanently overscrolled by the bar's height**, with nothing to scroll to.

| Don't | Do |
|-------|-----|
| `min-h-screen` on a page root | `min-h-full` — 100% of the scrolling `<main>` |
| `min-height: 100vh` in page CSS | `min-height: 100%` |
| `calc(100vh - 24px)` | `calc(100vh - 61px)` — the same 24px of gutters, **plus the 37px bar** |

`vh` still means the *window*, which now includes the bar. Anything computing `calc(100vh - …)` must subtract 37px on top of whatever it already accounted for. From `game.vue`:

```css
/* 100% (not 100vh) of the layout's scrolling <main>, which is the viewport less
   the top status bar — 100vh here would overflow the shell by the bar's height */
.vp-page {
  min-height: 100%;
}

.vp-col-left,
.vp-col-right {
  position: sticky;
  top: 12px;
  /* 12px gutter top and bottom, inside the viewport less the 37px status bar */
  max-height: calc(100vh - 61px);
  overflow-y: auto;
}
```

`position: sticky` now resolves against the scrolling `<main>`, not the document — so `top: 12px` is 12px below **the bar**, and sticky columns tuck under it instead of sliding behind it.

### Page Shell

Every page renders inside the shell's `<main>`, using this structure:

```html
<div class="min-h-full bg-gray-950 text-white">
  <div class="max-w-{size} mx-auto px-4 py-{n}">
    <!-- Header -->
    <!-- Content -->
    <!-- Footer -->
  </div>
</div>
```

`min-h-full`, **not** `min-h-screen` — see *Viewport Ownership*.

| Page Type | Max Width | Padding |
|-----------|-----------|---------|
| Setup | `max-w-4xl` (896px) | `p-6` |
| Game | Full width, columns centered | `p-2` to `p-4` |
| Stats/History | `max-w-5xl` (1024px) | `px-4 py-8` |
| Analysis | `max-w-5xl` | `px-4 py-8` |

### Header Pattern

The in-page header. It is page furniture and sits **below** the global status bar:

```html
<div class="flex items-center justify-between mb-8">
  <div>
    <h1 class="text-3xl font-bold text-white">Page Title</h1>
    <p class="text-gray-500 text-sm mt-1">Subtitle description</p>
  </div>
  <NuxtLink to="/">
    <UButton variant="ghost" color="neutral" size="sm" icon="i-lucide-arrow-left">Home</UButton>
  </NuxtLink>
</div>
```

Its "Home" goes to *this app's* setup page (`/`). It is **not** the hub exit and does not replace it — the two are different controls, and both are on the page.

### Footer Pattern

Also in-page, also below the bar. The nav row a page ends with:

```html
<footer class="border-t border-gray-800 pt-4 mt-10 flex items-center justify-center gap-4 text-xs text-gray-500">
  <NuxtLink to="/" class="hover:text-gray-300 transition-colors">Home</NuxtLink>
  <span>&middot;</span>
  <NuxtLink to="/game" class="hover:text-gray-300 transition-colors">Game</NuxtLink>
  <span>&middot;</span>
  <NuxtLink to="/analysis" class="hover:text-gray-300 transition-colors">Analysis</NuxtLink>
  <span>&middot;</span>
  <NuxtLink to="/history" class="hover:text-gray-300 transition-colors">History</NuxtLink>
  <AnalysisStatus />
  <span>&middot;</span>
  <a href="https://github.com/cschweda/{repo}" target="_blank" rel="noopener" class="hover:text-gray-300 transition-colors flex items-center gap-1">GitHub</a>
</footer>
```

A page omits its own link: the setup page has no "Home", the game page has no "Game". Copy the *pattern*, not this app's markup — video poker deviates twice. `index.vue` uses a plain `<div>` with the same classes minus `mt-10`, and `game.vue` re-implements the row in scoped CSS (`.vp-footer`) to match the machine's chrome. `<AnalysisStatus />` rides in the footer on setup, game and history, but not on analysis — that page reports its own run inline.

This footer is *not* a substitute for the status bar. It navigates **within** the app; the bar leaves it.

---

## Component Patterns

### Setup Page Cards

Variant/option selection cards:

```html
<div class="bg-gray-800/40 border border-gray-700/30 rounded-lg px-4 py-3 space-y-2">
  <h2 class="text-sm font-medium text-gray-300">Card Title</h2>
  <p class="text-xs text-gray-500 leading-relaxed">Description</p>
  <!-- Content -->
</div>
```

### Selectable Option Buttons

```html
<button
  class="px-3 py-2 rounded-md border font-mono transition-all"
  :class="selected
    ? 'border-primary-500 bg-primary-500/10 text-white'
    : 'border-gray-700/50 bg-gray-900/60 text-gray-300 hover:border-gray-600'"
>
```

### Metric Grid

```html
<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
  <div class="bg-gray-900/60 border border-gray-800/60 rounded-xl p-4">
    <div class="text-[0.65rem] text-gray-500 uppercase tracking-wider mb-2">Label</div>
    <div class="text-2xl font-bold font-mono text-green-400">Value</div>
  </div>
</div>
```

### Headline Stat (Stats Page)

```html
<div class="bg-gradient-to-br from-gray-900 to-gray-900/60 border border-gray-800 rounded-2xl p-6 flex items-center justify-between">
  <div>
    <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Label</div>
    <div class="text-4xl font-bold font-mono text-green-400">+$12.50</div>
  </div>
  <div class="text-right space-y-1">
    <div class="text-sm text-gray-400">47 hands</div>
    <div class="text-sm text-gray-400">99.1% return</div>
  </div>
</div>
```

### Tab Bar

```html
<div class="flex border-b border-gray-800 mb-6 gap-1">
  <button
    class="px-5 py-2.5 text-sm font-medium capitalize transition-all rounded-t-lg"
    :class="active
      ? 'text-white bg-gray-800/60 border-b-2 border-primary-500'
      : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/30'"
  >
    Tab Name
  </button>
</div>
```

### Tooltips

Wrap any metric that might confuse a new player:

```html
<UTooltip text="Explanation of what this number means and why it matters.">
  <div class="...">
    <span class="text-gray-400">Label</span>
    <span class="text-white font-mono">Value</span>
  </div>
</UTooltip>
```

### Profit Trend Bars

```html
<div class="flex items-end gap-[2px] h-20">
  <div
    v-for="(val, i) in profitTimeline"
    class="flex-1 rounded-t-sm"
    :class="val >= 0 ? 'bg-green-500/60' : 'bg-red-500/60'"
    :style="{ height: `${percent}%` }"
  />
</div>
```

### Expandable Hand Row

```html
<button class="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-800/20 transition-colors">
  <span class="text-xs text-gray-500 font-mono w-8">#47</span>
  <span class="font-mono text-white text-sm flex-1">Hand data</span>
  <span class="px-2 py-0.5 rounded text-[0.6rem] font-bold uppercase bg-green-900/40 text-green-400">WON</span>
  <span class="font-mono text-sm text-green-400 font-bold">+$11.25</span>
  <span class="text-gray-600">▸</span>
</button>
```

---

## Game Area vs Chrome

The page has two visual zones:

1. **Chrome** — the top status bar, setup, stats, analysis, footer, info bar, side panels. Uses the shared design system above. Identical across all simulators.

   The status bar and the hub exit inside it are the strictest case in the collection: identical *markup*, copied verbatim, not merely styled to match. Everything else here is a pattern to follow; those two are a component to clone.

2. **Game area** — the actual game rendering. Custom per game. This is where each simulator's visual identity lives:
   - Hold'em: Green felt table, chip stacks, community cards
   - Video Poker: Dark chrome cabinet, backlit pay table, LED readout
   - Craps: Green baize table layout, dice, bet markers
   - Blackjack: Green felt, card shoe, chip circles
   - Roulette: Wheel, number grid, ball animation
   - Slots: Reel strips, spin animation, paylines

The game area can use custom CSS, custom colors, custom fonts. The chrome around it uses the shared system.

---

## Simulation / Analysis Page Pattern

Every simulator should have an `/analysis` page that:

1. Runs batch simulations with configurable parameters
2. Shows per-variant/per-config results in metric grids
3. Displays per-run tables with return/delta/net
4. Offers downloadable reports
5. Runs in a Web Worker (non-blocking UI)
6. Shows progress bar + phase description
7. Has a status indicator in footer across all pages

---

## Accessibility Baseline

| Requirement | Implementation |
|-------------|---------------|
| Focus indicators | `focus-visible` ring on all interactive elements |
| Keyboard nav | Tab between groups, arrow within groups |
| Screen readers | `aria-label`, `aria-pressed`, `aria-live` |
| Label in Name | Where a control has visible text, its accessible name **contains that text verbatim** (WCAG 2.5.3) — see the hub exit |
| Landmarks | The status bar is a `<nav aria-label="App">`; page content is the layout's `<main>` |
| Color independence | Shape + color (not color alone) |
| Motion | `prefers-reduced-motion` respected |
| Contrast | WCAG 2.1 AA minimum |

---

## Security Headers (Netlify)

All simulators share the same hardened `netlify.toml` headers:

- `Content-Security-Policy: default-src 'none'` with explicit whitelist
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: credentialless`
- `X-Frame-Options: DENY`
- Full `Permissions-Policy` blocking all unused APIs
- Immutable cache on hashed assets

---

## Hero Image / og:image — Branded Background

Every simulator's hero image (used as the README header and `og:image` for social sharing) uses the same **branded background** with game-specific content layered on top. Size: **1200×630px** (standard og:image).

### Background Layers (Shared)

The background is built from 5 SVG layers that create a technical graph-paper aesthetic:

```
1. mc-bg          Deep navy-to-black diagonal gradient (#0a0c1a → #060810)
2. mc-grid-fine   20px fine grid lines (#1e2848, 0.6px stroke, 75% opacity)
3. mc-grid-major  100px major grid lines (#283458, 1.2px stroke, 80% opacity)
4. mc-dots        20px dot grid overlay (#2a3460, 0.7r circles, 70% opacity)
5. mc-vignette    Radial vignette darkening the edges
```

The grid should be clearly visible — not just a subtle texture, but recognizably graph paper. It evokes technical analysis, mathematical rigor, and the engineering-paper feel of EV calculations.

Plus structural elements:
- **Corner registration marks** — small L-shaped marks at all 4 corners (engineering drawing style)
- **Bottom branding line** — faint horizontal rule at y=600 with "METAINCOGNITA" letterspaced below it
- **Bottom accent bar** — 4px colored bar at y=594 in the game's accent color (gold for VP, green for Hold'em, red for Craps, etc.)

### SVG Defs to Copy

Every hero SVG should include these defs (copy from the Video Poker `hero.svg`):

```xml
<!-- Metaincognita branded background defs -->
<linearGradient id="mc-bg" ...>         <!-- base gradient -->
<pattern id="mc-grid-fine" ...>         <!-- 20px fine grid -->
<pattern id="mc-grid-major" ...>        <!-- 100px major grid -->
<pattern id="mc-dots" ...>              <!-- dot overlay -->
<radialGradient id="mc-vignette" ...>   <!-- edge darkening -->
<symbol id="mc-corner" ...>             <!-- registration mark -->
<linearGradient id="mc-wordmark-line" ...>  <!-- bottom line -->
```

### Background Rect Stack

```xml
<rect width="1200" height="630" fill="url(#mc-bg)"/>
<rect width="1200" height="630" fill="url(#mc-grid-fine)" opacity="0.5"/>
<rect width="1200" height="630" fill="url(#mc-grid-major)" opacity="0.5"/>
<rect width="1200" height="630" fill="url(#mc-dots)" opacity="0.4"/>
<rect width="1200" height="630" fill="url(#mc-vignette)"/>

<!-- Corner marks -->
<use href="#mc-corner" x="16" y="16" width="30" height="30"/>
<use href="#mc-corner" x="1184" y="16" width="30" height="30" transform="scale(-1,1) translate(-1200,0)"/>
<use href="#mc-corner" x="16" y="614" width="30" height="30" transform="scale(1,-1) translate(0,-630)"/>
<use href="#mc-corner" x="1184" y="614" width="30" height="30" transform="scale(-1,-1) translate(-1200,-630)"/>

<!-- Branding -->
<line x1="0" y1="600" x2="1200" y2="600" stroke="url(#mc-wordmark-line)" stroke-width="0.5"/>
<text x="600" y="618" fill="#2a3050" font-family="system-ui" font-size="10" text-anchor="middle" letter-spacing="4">METAINCOGNITA</text>

<!-- Game accent bar (change color per game) -->
<rect x="0" y="594" width="1200" height="4" fill="url(#game-accent-gradient)" opacity="0.4"/>
```

### Game-Specific Content

After the background layers, add game-specific content:
- **Title** — game name in the game's accent color with glow filter
- **Subtitle** — one-line description in gray
- **Visual** — cards, dice, table, wheel, etc. at ~y=160-360
- **Data** — EV analysis, stats, bot comparison at ~y=400-580

### Converting to PNG

```bash
# Requires poppler (brew install poppler) or librsvg (brew install librsvg)
rsvg-convert -w 1200 -h 630 public/hero.svg -o public/hero.png
```

The README references the PNG (`public/hero.png`) for GitHub compatibility. The SVG is kept as the source file.

---

## File Structure Convention

```
{simulator}/
├── app/
│   ├── app.vue                    # UApp + NuxtLayout + NuxtPage
│   ├── app.config.ts              # primary color, tooltip config
│   ├── layouts/
│   │   └── default.vue            # App shell: top status bar + scrolling <main>
│   ├── pages/
│   │   ├── index.vue              # Setup / selection
│   │   ├── game.vue               # The game
│   │   ├── analysis.vue           # Simulation runner
│   │   └── history.vue            # Session stats
│   ├── components/
│   │   ├── AppHubLink.vue         # Hub exit — gold METAINCOGNITA wordmark
│   │   ├── {GameSpecific}.vue     # Custom game rendering
│   │   └── AnalysisStatus.vue     # Footer status indicator
│   ├── stores/
│   │   ├── game.ts                # Game state
│   │   └── analysis.ts            # Simulation state
│   └── utils/
│       ├── {gameLogic}.ts         # Pure game logic
│       ├── simulator*.ts          # Simulation runner
│       └── strategyLookup.ts      # Fast strategy (if applicable)
├── docs/
├── public/
│   └── hero.png                   # README hero image
├── nuxt.config.ts
├── netlify.toml
├── package.json
├── README.md
├── CHANGELOG.md
└── LICENSE
```
