# Doc 08 — Differentiation

> **Project:** Video Poker Simulator
> **Purpose:** What makes this simulator different from existing video poker training tools

---

## Competitive Landscape

Several video poker trainers exist. The most prominent:

### Bob Dancer's Video Poker for Winners (WinPoker)

The gold standard for serious video poker players. Windows desktop application (legacy, no longer updated). Comprehensive strategy training with EV analysis. Covers most variants. The reference implementation for optimal strategy data.

**Limitations:** Windows-only. Desktop software from the early 2000s — dated UI. Not browser-based. Not mobile-friendly. No convergence visualization. No bot comparison. No pay table literacy module. Expensive ($50+).

### VideoPokerTrainer.org

Free web-based trainer. Covers several variants. Shows optimal play after each hand. Basic mistake tracking.

**Limitations:** Minimal UI — looks like a web form, not a machine. No full 32-option EV breakdown. No hand history log. No convergence viewer. No Machine Scout mode. No bot comparison. No hand category trainer for targeted practice. No pay table literacy tutorial.

### Video Poker for Winners (iOS/Android)

Mobile port of WinPoker concepts. Decent UI. Basic training features.

**Limitations:** Mobile-only. Limited variant support. No deep analytical features.

### Free Casino Apps (PokerStars VP, etc.)

Pretty UI, gamified. Designed to entertain, not educate. No strategy training. No EV analysis. No mistake tracking. These are games, not tools.

---

## This Simulator's Differentiators

### 1. The Training Panel

No existing free web-based trainer shows all 32 hold/discard options ranked by EV for every dealt hand. This is the single most powerful learning feature — it doesn't just tell you what to do, it shows you why, with exact numbers. "Hold the low pair (EV: 1.04) instead of the ace kicker (EV: 0.82) because the pair has 45 more winning draw outcomes."

### 2. Hand History as Learning Journal

Session replay with per-hand EV breakdowns. Filter by mistakes. Expand any hand to see the full 32-option analysis. This turns a play session into a study session after the fact — review your mistakes with full context, not just a summary stat.

### 3. Convergence Viewer

No existing trainer lets you watch the return percentage converge in real time over thousands of hands. This is the most effective way to teach variance, expected value, and the law of large numbers — concepts that most players think they understand but demonstrably don't.

### 4. Machine Scout Mode

A gamified quiz on pay table identification. No other trainer teaches the skill of reading a pay table on a real casino floor. This is arguably the single most valuable real-world skill in video poker — finding the right machine before you sit down.

### 5. Bot Comparison

Playing the same dealt hands through four different skill levels and comparing the results. The visual gap between Perfect Pat and Gut-Feel Gary on the bankroll chart is the most compelling argument for learning strategy that exists. No other free web trainer does this.

### 6. Pay Table Literacy Module

An interactive tutorial that teaches pay table reading before a single hand is played. The annual cost calculator ($5,600/year from one wrong number) is a wake-up call that motivates the rest of the training.

### 7. Hand Category Trainer

Targeted practice on specific decision types. Rather than waiting for a pair-vs-four-to-flush hand to appear naturally (which might take dozens of hands), the trainer deals them on demand. Deliberate practice, not random repetition.

### 8. Modern Web Stack, Free, Open

Browser-based, mobile-responsive, free, no download, no account required. Works on any device with a modern browser. The entire simulator runs client-side — no server, no data collection, no monetization.

---

## What This Simulator Is NOT

- **Not a real-money game.** No wagering, no payouts, no cash.
- **Not a casino app.** No gamification designed to keep you playing longer. No "rewards," no "daily bonuses," no dark patterns.
- **Not a slot machine trainer.** Slots are pure negative-EV with no skill component. Video poker is fundamentally different — the player's decisions matter.
- **Not a social game.** No multiplayer, no leaderboards (except personal Machine Scout scores), no sharing. This is a solo study tool.

---

## Positioning Within the Simulator Collection

| Existing Trainer | Teaches "What to Do" | Teaches "Why" | Teaches "How Much It Costs" | Teaches "How to Find Good Machines" |
|-----------------|---------------------|---------------|---------------------------|-------------------------------------|
| WinPoker | Yes | Partially | Partially | No |
| VideoPokerTrainer.org | Yes | No | Minimally | No |
| Casino Apps | No | No | No | No |
| **This Simulator** | **Yes** | **Yes (32-option EV)** | **Yes (mistake cost + convergence)** | **Yes (Machine Scout + Pay Table Literacy)** |

The differentiator isn't any single feature — it's the combination. This is the first free web-based video poker trainer that covers the full learning cycle: find the right machine → understand the math → learn the strategy → practice the hard decisions → measure your progress → see the long-run proof.
