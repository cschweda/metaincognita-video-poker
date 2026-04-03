# Doc 00 Addendum — Visual Design Specification

> **Project:** Video Poker Simulator
> **Purpose:** Detailed visual rendering spec for the video poker machine UI in Nuxt 4 / Nuxt UI v4
> **Applies to:** All variants (Tier 1 and Tier 2)

---

## Design Philosophy

The simulator renders a **video poker cabinet** — not a web form, not a card game abstraction, not a generic casino app. The player should feel like they're looking at an actual machine in a casino. The aesthetic is **CRT-era machine realism with modern clarity**: dark cabinet chrome, bright card faces, neon-accented pay table, glowing control buttons. Think late-1980s IGT machine meets high-DPI display.

The entire machine is a single contained visual unit. It doesn't bleed into the page. It sits in the viewport like a cabinet sits on a casino floor.

---

## Card Rendering: Pure CSS + Inline SVG

No external card images. Cards are rendered entirely with CSS and inline SVG suit symbols. This approach scales perfectly, loads instantly, is fully accessible, and gives complete control over card states (held, dimmed, flipping, face-down).

### Card Face Structure

Each card is a Vue component (`SingleCard.vue`) that renders a rectangular card face:

```
┌─────────────┐
│ A            │  ← rank (top-left corner)
│ ♠            │  ← suit symbol (top-left, below rank)
│              │
│      ♠       │  ← center suit symbol (large)
│              │
│            ♠ │  ← suit symbol (bottom-right, inverted)
│            A │  ← rank (bottom-right corner, inverted)
└─────────────┘
```

**Rank display:** Text character. Uses a monospace or display font (e.g., "Fira Code," "JetBrains Mono," or a custom display face — something that evokes dot-matrix machine readouts without being illegible). Face card ranks use single letters: J, Q, K, A. Numeric ranks use the number: 2–10.

**Suit symbols:** Inline SVG paths for each suit. Four symbols, four colors:

| Suit | Color | SVG Shape |
|------|-------|-----------|
| Spades ♠ | `#1a1a2e` (near-black) | Classic spade silhouette |
| Hearts ♥ | `#e63946` (crimson) | Heart silhouette |
| Diamonds ♦ | `#457b9d` (steel blue) | Diamond/rhombus |
| Clubs ♣ | `#2d6a4f` (forest green) | Trefoil silhouette |

**Why four colors instead of traditional two (black/red)?** Accessibility. Two-color suits rely on the player distinguishing shape alone when color is removed. Four distinct colors provide an additional visual channel without requiring color as the sole differentiator. The shapes remain the primary identifier; the colors are reinforcement. This exceeds the WCAG requirement and aligns with the approach used in many accessibility-focused card decks.

**Suit SVG paths:** Compact inline SVGs (< 200 bytes each). Defined once as a Vue component or SVG `<symbol>` set, referenced throughout.

### Card Back

The card back is a CSS-rendered pattern — no image. A dark background with a repeating geometric pattern:

- Base color: `#1a1a2e` (deep navy)
- Pattern: Repeating diagonal crosshatch or diamond grid in `#2a2a4e` (slightly lighter)
- Thin border: `#c9a227` (gold accent) — matches the machine chrome

The pattern is rendered via CSS `background-image` using `repeating-linear-gradient` or a tiny inline SVG pattern. Lightweight, scalable, distinctive.

### Card Dimensions and Proportions

Standard poker card ratio: **2.5:3.5** (5:7). On desktop, each card renders at approximately **120px × 168px**. Five cards with gaps fit comfortably in an 800px-wide machine.

```css
.card {
  --card-width: 120px;
  --card-height: calc(var(--card-width) * 1.4);
  --card-radius: 8px;
  
  width: var(--card-width);
  height: var(--card-height);
  border-radius: var(--card-radius);
  position: relative;
  perspective: 600px; /* for flip animation */
}
```

On mobile (< 640px), cards scale down to **~70px × 98px** via a CSS custom property override.

### Card States

Each card has four visual states, controlled by CSS classes:

**1. Face down (pre-deal):**
- Shows card back pattern
- Slight drop shadow (`box-shadow: 0 2px 8px rgba(0,0,0,0.3)`)

**2. Face up (dealt, not held):**
- White card face with rank and suit rendered
- Normal drop shadow
- Full opacity

**3. Face up, HELD:**
- Card translates upward by 16px (`transform: translateY(-16px)`)
- Gold border glow (`box-shadow: 0 0 12px rgba(201, 162, 39, 0.6)`)
- "HELD" label appears centered above the card in a small pill badge
- The HELD label is the `aria-pressed` visual indicator

**4. Face up, NOT held (after holds are set):**
- Slight dimming: `opacity: 0.6`
- No vertical shift
- Signals visually that this card will be replaced on draw

```css
.card--held {
  transform: translateY(-16px);
  box-shadow: 0 0 12px rgba(201, 162, 39, 0.6);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.card--dimmed {
  opacity: 0.6;
  transition: opacity 0.15s ease;
}
```

### Card Flip Animation

The deal and draw use a 3D card flip. Each card has an inner container with front and back faces:

```css
.card__inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.4s ease;
}

.card--flipped .card__inner {
  transform: rotateY(180deg);
}

.card__front,
.card__back {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: var(--card-radius);
}

.card__back {
  transform: rotateY(180deg);
}
```

**Deal animation:** Cards start face-down, then flip face-up one at a time with staggered delays (0ms, 80ms, 160ms, 240ms, 320ms). The stagger creates a left-to-right "dealing" feel.

**Draw animation:** Non-held cards flip face-down (0.4s), pause briefly (0.1s), then flip to their new face (0.4s). Held cards remain stationary. The flip-down → flip-up creates the "card replacement" feel of a real machine.

**`prefers-reduced-motion`:** When enabled, skip all flip animations. Cards simply appear face-up instantly. The `transition-duration` is set to `0s`.

---

## Wild Card Visual Treatment

Wild cards need a distinct visual treatment so they're immediately recognizable:

**Deuces (in Deuces Wild):** The four 2s render with a neon accent — a glowing border or background gradient that signals "this is wild." When held, the glow intensifies. The "WILD" text appears below the rank in small caps:

```
┌─────────────┐
│ 2            │
│ ♥            │
│   WILD       │  ← small caps label
│      ♥       │
│            ♥ │
│            2 │
└─────────────┘
```

Color: a bright accent (e.g., `#ffd60a` gold or `#06d6a0` teal) that contrasts with the normal card styling.

**Joker (in Joker Poker):** Renders with a unique card face — no standard rank/suit. Instead: a jester hat icon (simple inline SVG), the word "JOKER" vertically centered, and a distinct card color (purple or multi-color gradient background). Immediately identifiable in any hand.

---

## Machine Layout

The machine is a single centered container with a dark chrome frame. All game elements live inside it.

### Desktop Layout (≥ 1024px)

```
┌──────────────────────────────────────────────────────────────────┐
│                        MACHINE CHROME (top)                       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    PAY TABLE DISPLAY                        │  │
│  │  Royal Flush ........... 250  500  750  1000 >>>4000<<<    │  │
│  │  Straight Flush ........ 50   100  150   200   250         │  │
│  │  Four of a Kind ........ 25    50   75   100   125         │  │
│  │  Full House ............  9    18   27    36    45          │  │
│  │  Flush .................  6    12   18    24    30          │  │
│  │  Straight ..............  4     8   12    16    20          │  │
│  │  Three of a Kind .......  3     6    9    12    15          │  │
│  │  Two Pair ..............  2     4    6     8    10          │  │
│  │  Jacks or Better .......  1     2    3     4     5          │  │
│  │                                                             │  │
│  │  Return: 99.54%                              5 coins bet   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│          ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │
│          │  A   │ │  K   │ │  7   │ │  7   │ │  3   │           │
│          │  ♠   │ │  ♥   │ │  ♦   │ │  ♣   │ │  ♥   │           │
│          │      │ │      │ │      │ │      │ │      │           │
│          │  ♠   │ │  ♥   │ │  ♦   │ │  ♣   │ │  ♥   │           │
│          │   A  │ │   K  │ │   7  │ │   7  │ │   3  │           │
│          └──────┘ └──────┘ └──────┘ └──────┘ └──────┘           │
│           HELD                HELD    HELD                       │
│                                                                   │
│        ──────────  RESULT: TWO PAIR — 2 Credits  ──────────      │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ BET ONE │ BET MAX │    >>>  DEAL / DRAW  <<<    │ SPEED: ⚡ ││
│  │                                                              ││
│  │ Credits: 98          $24.50          Bet: 5 × $0.25 = $1.25 ││
│  └──────────────────────────────────────────────────────────────┘│
│                        MACHINE CHROME (bottom)                    │
└──────────────────────────────────────────────────────────────────┘

         ┌──────────────────────────────────────┐
         │         TRAINING PANEL (below)        │
         │                                       │
         │  Your play: Hold A♠, 7♦, 7♣           │
         │  Optimal:   Hold 7♦, 7♣               │
         │  Your EV: 0.824  Optimal EV: 0.871    │
         │  Cost of mistake: $0.06                │
         │                                        │
         │  Session: 47 hands, 3 mistakes         │
         │  EV lost: $0.42  Return: 99.1%         │
         │                                        │
         │  [▾ Show all 32 options]               │
         │  [▾ Hand History]                      │
         └──────────────────────────────────────┘
```

### Desktop with Training Panel Expanded (≥ 1280px)

On wide screens, the training panel can dock to the right of the machine as a sidebar rather than sitting below it:

```
┌────────────────────────────────────┐  ┌─────────────────────────┐
│          MACHINE (680px)           │  │   TRAINING PANEL (360px) │
│                                    │  │                          │
│  [pay table]                       │  │  Optimal: Hold 7♦, 7♣   │
│                                    │  │  Your EV: 0.824          │
│  [5 cards]                         │  │  Optimal EV: 0.871       │
│                                    │  │  Cost: $0.06             │
│  [result]                          │  │                          │
│                                    │  │  All 32 Options:         │
│  [controls]                        │  │  1. Hold 7♦ 7♣  EV:0.871│
│                                    │  │  2. Hold A♠ 7♦ 7♣ 0.824 │
│                                    │  │  3. Hold 7♦ 7♣ 3♥ 0.798 │
│                                    │  │  ...                     │
│                                    │  │                          │
│                                    │  │  [Hand History ▾]        │
└────────────────────────────────────┘  └─────────────────────────┘
```

### Mobile Layout (< 640px)

Everything stacks vertically. The machine fills the viewport width. Cards scale down. The pay table collapses to show only the current bet column (expandable to full table on tap). The training panel moves below the machine.

```
┌──────────────────────┐
│  PAY TABLE (compact)  │
│  RF: 4000  SF: 250   │
│  4K: 125  FH: 45     │
│  [Expand ▾]          │
├──────────────────────┤
│ ┌────┐┌────┐┌────┐   │
│ │ A♠ ││ K♥ ││ 7♦ │   │
│ └────┘└────┘└────┘   │
│    ┌────┐┌────┐      │
│    │ 7♣ ││ 3♥ │      │
│    └────┘└────┘      │
│    HELD   HELD        │
│                       │
│  TWO PAIR — 2 Credits │
│                       │
│ [BET MAX] [DEAL/DRAW] │
│ Credits: 98  $24.50   │
├──────────────────────┤
│  TRAINING PANEL       │
│  Your EV: 0.824       │
│  Optimal EV: 0.871    │
│  Cost: $0.06          │
└──────────────────────┘
```

On mobile, the 5 cards can arrange as a 3-2 stack (three on top, two centered below) or remain in a single row at smaller card sizes. The 3-2 layout is more tappable on phones.

### Tablet Layout (640px – 1023px)

Machine at full width, training panel below. Cards at near-desktop size. No sidebar.

---

## Machine Chrome

The machine frame is CSS — no images. The aesthetic is dark brushed metal:

```css
.machine {
  --chrome-bg: #1a1a2e;
  --chrome-border: #2a2a4e;
  --chrome-accent: #c9a227;   /* gold trim */
  --machine-max-width: 720px;
  
  max-width: var(--machine-max-width);
  margin: 0 auto;
  background: linear-gradient(
    180deg,
    #1e1e3a 0%,
    #1a1a2e 10%,
    #16162a 100%
  );
  border: 2px solid var(--chrome-border);
  border-radius: 12px;
  box-shadow:
    0 0 0 1px var(--chrome-accent),
    0 8px 32px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  padding: 24px;
}
```

The gold accent line (`--chrome-accent`) is the signature detail — it traces the machine's outer edge like the gold trim on a real IGT cabinet. Subtle, but it sells the "machine" feel.

---

## Pay Table Display

The pay table is a semantic HTML `<table>` styled to evoke the backlit glass panel on a real video poker machine.

### Structure

| | 1 Coin | 2 Coins | 3 Coins | 4 Coins | 5 Coins |
|--|--------|---------|---------|---------|---------|
| Royal Flush | 250 | 500 | 750 | 1000 | **4000** |
| Straight Flush | 50 | 100 | 150 | 200 | 250 |
| ... | | | | | |

### Styling

- Background: slightly lighter than the machine chrome (`#22223a`)
- Text: bright, high-contrast (`#e0e0ff` — cool white with a slight blue tint, like a CRT phosphor)
- Active column (matching current bet level): highlighted with a glow (`background: rgba(201, 162, 39, 0.15)`)
- Winning hand row (after draw): entire row lights up with the gold accent and the payout value pulses briefly

```css
.pay-table__row--winner {
  background: rgba(201, 162, 39, 0.2);
  color: #ffd60a;
  animation: winner-pulse 0.6s ease;
}

@keyframes winner-pulse {
  0%, 100% { background: rgba(201, 162, 39, 0.2); }
  50% { background: rgba(201, 162, 39, 0.4); }
}
```

### Variant Adaptation

The pay table automatically adjusts its rows for the active variant:

- **JoB / Bonus Poker:** 9 rows (Royal Flush through Jacks or Better)
- **Double Bonus:** 11 rows (Four Aces, Four 2s–4s, Four 5s–Ks as separate rows)
- **Double Double Bonus:** 13 rows (kicker-differentiated four-of-a-kind rows)
- **Deuces Wild:** 10 rows (Natural Royal, Four Deuces, Wild Royal, Five of a Kind, etc.)
- **Joker Poker:** 11 rows (Natural Royal, Five of a Kind, Wild Royal, etc.)

The pay table component receives the active `PayTable` object and renders rows dynamically from its `handPayouts` entries. No hardcoded rows — the table is entirely data-driven.

### Theoretical Return Indicator

Below the pay table, a small line of text:

```
Theoretical Return: 99.54% with optimal play
```

Styled subtly — `font-size: 0.75rem`, `opacity: 0.7`. Something a real machine would never show you, but this training tool makes visible. If the player is betting less than max coins, this line updates to show the reduced return with a warning color:

```
Theoretical Return: ~98.0% (not betting max coins!)
```

---

## Control Bar

The control bar sits below the card area, inside the machine chrome. Styled as physical buttons on a machine console:

### Button Design

Buttons are large, tactile-looking, with depth:

```css
.control-btn {
  background: linear-gradient(180deg, #3a3a5e 0%, #2a2a4e 100%);
  border: 1px solid #4a4a6e;
  border-radius: 6px;
  color: #e0e0ff;
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow:
    0 4px 0 #1a1a2e,        /* depth shadow — makes it look raised */
    0 6px 12px rgba(0,0,0,0.3);
  transition: transform 0.1s, box-shadow 0.1s;
}

.control-btn:active {
  transform: translateY(2px);
  box-shadow:
    0 2px 0 #1a1a2e,
    0 3px 6px rgba(0,0,0,0.3);
}
```

The `translateY` + `box-shadow` change on `:active` creates a physical "button press" feel.

### Deal/Draw Button

The primary action button. Larger than the others. Gold accent color when active:

```css
.control-btn--primary {
  background: linear-gradient(180deg, #c9a227 0%, #a88520 100%);
  color: #1a1a2e;
  font-size: 1.2rem;
  padding: 14px 48px;
  box-shadow:
    0 4px 0 #6b5510,
    0 0 20px rgba(201, 162, 39, 0.3);
}
```

The button label changes state:
- Pre-deal (no active hand): **"DEAL"**
- After deal (holds phase): **"DRAW"**
- During animation: disabled, no label change

### Credit Display

Below the buttons, a readout styled like a machine's LED display:

```
Credits: 98          $24.50          Bet: 5 × $0.25 = $1.25
```

Use a monospace font for the numbers. Slight green tint on the text (`#4ade80`) to evoke LED readouts:

```css
.credit-display {
  font-family: 'Fira Code', 'JetBrains Mono', monospace;
  color: #4ade80;
  font-size: 0.9rem;
  letter-spacing: 0.08em;
  text-shadow: 0 0 8px rgba(74, 222, 128, 0.4);
}
```

---

## Result Display

After the draw, the result appears between the card area and the control bar:

**Winning hand:**
```
━━━  FULL HOUSE — 45 Credits  ━━━
```

Gold text, centered, with decorative horizontal rules. Brief scale-up animation (`transform: scale(1.05)` → `scale(1)`) for emphasis.

**Losing hand:**
```
No Win
```

Dimmed text (`opacity: 0.5`), no animation. No drama for a loss.

---

## Training Panel

The training panel sits outside the machine chrome — either below it (default) or to its right (on wide screens). It's styled differently from the machine: lighter background, readable body text, more conventional UI styling. The machine is the "casino." The training panel is the "classroom."

```css
.training-panel {
  background: #f8f8fc;         /* light, clean */
  color: #1a1a2e;
  border-radius: 8px;
  padding: 20px;
  font-family: system-ui, sans-serif;  /* readable, not machine-themed */
  max-width: 400px;
}
```

This contrast is intentional — the machine feels like a machine, the training panel feels like an instructor standing next to you.

### 32-Option EV Display

When expanded, shows all 32 hold combinations sorted by EV:

```
 #  Hold               EV      Δ Best
 1  7♦ 7♣             0.871   —
 2  A♠ 7♦ 7♣          0.824   -0.047
 3  7♦ 7♣ 3♥          0.798   -0.073
 4  K♥ 7♦ 7♣          0.791   -0.080
 ...
31  A♠ K♥ 7♦ 3♥       0.334   -0.537
32  A♠ K♥ 7♦ 7♣ 3♥    0.410   -0.461
```

Each row shows the held cards using mini card icons (rank + colored suit symbol inline). The player's actual hold is highlighted. The optimal hold (row 1) is marked with a green indicator. The delta column shows how much worse each option is than the best.

---

## Hold Toggle Interaction

The hold toggle is the most important interaction in the game. It needs to feel responsive and unambiguous.

**Click/tap on a card face** toggles its hold state. The entire card is the touch target — not a separate button below it.

**Visual feedback:**
1. Immediate: card translates up by 16px and gains a gold glow (CSS transition, 150ms)
2. "HELD" label fades in above the card
3. Second click/tap: card drops back down, glow fades, label disappears

**Keyboard:**
- Arrow Left / Arrow Right: move focus between cards (wraps at edges)
- Space or Enter: toggle hold on the focused card
- Focus ring: standard visible focus indicator (offset, high-contrast)

**Accessibility:**
```html
<button
  class="card"
  :class="{ 'card--held': isHeld, 'card--dimmed': otherCardsHeld && !isHeld }"
  :aria-pressed="isHeld"
  :aria-label="`${rankName} of ${suitName}${isHeld ? ', held' : ''}`"
  @click="toggleHold"
  @keydown.left="focusPrev"
  @keydown.right="focusNext"
>
```

Each card is a `<button>` with `aria-pressed`, not a div with a click handler. This gives screen readers full toggle semantics for free.

---

## Nuxt UI v4 Integration

Nuxt UI v4 provides the foundation for non-machine UI elements:

**Used for:**
- Setup page layout, form controls (variant selector, denomination picker, toggle switches)
- Training panel structure (cards, collapsible sections, tables)
- Machine Scout scoring UI
- Hand Category Trainer category list
- Pay Table Literacy tutorial navigation
- Bot comparison dashboard (tables, tabs)
- Convergence viewer controls (dropdowns, sliders)
- Modals (variant switch confirmation, max coin warning explainer)
- Toast notifications (hand result announcements in mobile, etc.)

**NOT used for:**
- The machine itself (custom-styled to look like a cabinet)
- Cards (entirely custom CSS + SVG)
- Pay table inside the machine (custom-styled to match machine aesthetic)
- Control buttons (custom-styled for physical button feel)
- Credit display (custom LED-readout styling)

This separation keeps the machine feeling like a machine while the training/educational UI uses Nuxt UI's clean, accessible component library.

---

## Animation Summary

| Animation | Duration | Easing | Reduced Motion |
|-----------|----------|--------|----------------|
| Card flip (deal) | 400ms | ease | Skip (instant appear) |
| Card flip stagger | 80ms per card | linear | Skip |
| Card flip (draw) | 400ms down + 400ms up | ease | Skip |
| Hold toggle (raise) | 150ms | ease | Skip (instant state) |
| Hold toggle (dim) | 150ms | ease | Skip |
| Winner pulse | 600ms | ease | Skip |
| Result scale | 300ms | ease-out | Skip |
| Button press | 100ms | linear | Keep (subtle enough) |

All animations gated by:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Color Palette

```css
:root {
  /* Machine chrome */
  --chrome-bg: #1a1a2e;
  --chrome-border: #2a2a4e;
  --chrome-surface: #22223a;
  --chrome-accent: #c9a227;
  
  /* Card faces */
  --card-bg: #ffffff;
  --card-border: #d0d0d8;
  --card-shadow: rgba(0, 0, 0, 0.15);
  
  /* Suit colors (4-color deck) */
  --suit-spades: #1a1a2e;
  --suit-hearts: #e63946;
  --suit-diamonds: #457b9d;
  --suit-clubs: #2d6a4f;
  
  /* UI accents */
  --gold: #c9a227;
  --gold-bright: #ffd60a;
  --led-green: #4ade80;
  --winner-glow: rgba(201, 162, 39, 0.3);
  --error-red: #ef4444;
  
  /* Wild card accent */
  --wild-glow: #06d6a0;
  --wild-bg: rgba(6, 214, 160, 0.1);
  
  /* Training panel (light theme) */
  --panel-bg: #f8f8fc;
  --panel-text: #1a1a2e;
  --panel-optimal: #16a34a;
  --panel-mistake: #dc2626;
}
```

---

## Font Stack

```css
/* Machine elements (pay table, credits, result display) */
--font-machine: 'Fira Code', 'JetBrains Mono', 'Courier New', monospace;

/* Card rank display */
--font-card: 'Fira Code', 'JetBrains Mono', monospace;

/* Training panel and educational content */
--font-body: system-ui, -apple-system, sans-serif;

/* Headings in training panel */
--font-heading: system-ui, -apple-system, sans-serif;
```

The machine uses monospace throughout — it's a machine. The training panel uses the system font stack for readability. The contrast reinforces the machine/classroom split.

---

## Component Inventory

| Component | Purpose | Custom or Nuxt UI |
|-----------|---------|-------------------|
| `Machine.vue` | Cabinet frame, layout container | Custom CSS |
| `SingleCard.vue` | Individual card rendering + flip | Custom CSS + SVG |
| `CardHand.vue` | 5-card layout + hold logic | Custom CSS |
| `PayTableDisplay.vue` | Backlit pay table inside machine | Custom CSS |
| `ResultDisplay.vue` | Win/loss announcement | Custom CSS |
| `ControlBar.vue` | Bet/Deal/Draw buttons + credits | Custom CSS |
| `TrainingPanel.vue` | EV analysis, mistakes, history | Nuxt UI |
| `HandHistory.vue` | Scrollable hand log | Nuxt UI |
| `EVBreakdown.vue` | 32-option ranked list | Nuxt UI |
| `BotComparison.vue` | Post-session dashboard | Nuxt UI |
| `ConvergenceViewer.vue` | Auto-play chart | Nuxt UI + chart lib |
| `PayTableLiteracy.vue` | Tutorial module | Nuxt UI |
| `MachineScout.vue` | Timed quiz | Nuxt UI |
| `HandCategoryTrainer.vue` | Targeted practice | Nuxt UI |
| `SetupPage.vue` | Variant/config selection | Nuxt UI |
