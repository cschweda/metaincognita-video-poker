# Doc 10 — Revision & Gap Analysis

> **Project:** Video Poker Simulator
> **Purpose:** Track changes from the original high-level design, document all implemented improvements, enumerate open questions

---

## Revision History

### v1 → v2 (Current)

The original document was a single high-level design overview generated in a prior session. It was strong on domain knowledge, variant coverage, and educational philosophy but had gaps in interface contracts, edge case coverage, accessibility, and consistency. The v2 revision expands the single document into the full 13-document design suite and addresses all identified issues.

---

## Implemented Improvements

### Improvement 1: Full 13-Document Suite

**Original:** Single high-level design document doing the work of several documents — architecture decisions inline, phasing sketched but not detailed, no LLM build prompt, no security doc.

**Revision:** Full 13-document suite following the standard project design process. Doc 00 is the master overview; Docs 01–05 are phase-specific with detailed deliverables, interfaces, and testing checklists; Docs 06–12 cover security, build prompts, differentiation, deployment, revisions, architecture decisions, and use cases.

### Improvement 2: Variant-Agnostic HoldAnalysis Interface

**Original:** `HoldAnalysis.handDistribution` was a fixed object with 10 hardcoded hand type fields (royalFlush, straightFlush, etc.). This broke for Double Double Bonus (14 kicker-differentiated types) and Deuces Wild (12+ types).

**Revision:** `handDistribution` is now `Record<string, number>`, keyed by the active variant's hand type enum. The EV calculator is truly variant-agnostic. See Doc 11, ADR-02.

### Improvement 3: Wild Card EV Calculator Combinatorics

**Original:** Wild card section noted that Joker Poker changes C(47,3) to C(48,3) and called it "a parameter change, not a structural one." This understated the problem — the wild classifier itself is a different evaluation function, not just a parameter.

**Revision:** New section in Doc 00 ("Wild Card EV Calculator: Optimal Assignment Problem") explains the top-down hand-type evaluation approach, why it's faster than brute-force card assignment, and how it scales with 1–4 wild cards. Doc 05 has the full implementation spec.

### Improvement 4: Error States and Edge Cases

**Original:** No mention of zero-credit state, hold-all-5 behavior, pat royal flush handling, or other UX edge cases.

**Revision:** Doc 12 (Use Cases) enumerates 15+ edge cases with expected behavior. Doc 01 includes the zero-credit state in the Phase 1 spec. Doc 02 addresses hold-all-5 in the EV calculator context.

### Improvement 5: Convergence Viewer Promoted to Tier 1

**Original:** "Speed/auto-play mode for rapid statistical demonstration" was listed in Future (v2+).

**Revision:** Promoted to Phase 4 as the "Convergence Viewer." Rationale: the statistical validation suite already runs millions of hands — the convergence viewer is just a chart UI on top of that computation engine. It's also one of the most visually compelling and educationally valuable features. Added to Doc 00, detailed in Doc 04.

### Improvement 6: Accessibility Section

**Original:** No mention of accessibility despite the project developer's extensive ADA compliance work.

**Revision:** Comprehensive accessibility section in Doc 00. Per-phase accessibility checklists in Docs 01–05. Requirements include: ARIA states on hold toggles, keyboard navigation, screen reader card announcements, semantic table markup, contrast compliance, `prefers-reduced-motion` support, axe-core zero-violation gate. See Doc 00, "Accessibility."

### Improvement 7: Yarn Choice Documented

**Original:** File structure showed `yarn.lock` but the developer's default stack now uses pnpm.

**Revision:** Yarn is an intentional choice for consistency with the Hold'em and Craps simulators. Documented in Doc 11, ADR-01.

### Improvement 8: Machine Scout Mode Tiering Resolved

**Original:** Machine Scout appeared in both the Pay Table Literacy section (implying Tier 1) and the Future (v2+) requirements list. Contradictory.

**Revision:** Machine Scout is Tier 1, Phase 3. Removed from Future list. It's a lightweight feature that reinforces the document's core thesis about pay table literacy and reuses pay table data already in the system.

### Improvement 9: Hand History / Session Replay

**Original:** Session statistics tracked aggregate numbers but no per-hand log. Players couldn't review individual hands or study specific mistakes after the fact.

**Revision:** Hand History log added to Phase 2. Stores every hand played with dealt cards, player holds, optimal holds, draw result, and per-hand EV breakdown. Expandable entries show the full 32-option analysis. Filter by mistakes. See Doc 02.

### Improvement 10: Bot Implementation Clarified

**Original:** Bot section described four personas but didn't specify whether they run in parallel during play or retroactively.

**Revision:** Retroactive replay. Bots compute their results after the player's session by replaying the dealt hands from the hand history. Documented in Doc 00 ("Bot System") and detailed in Doc 04. This avoids real-time parallel state complexity.

### Minor Improvements

- **NLH spelled out:** "NLH" in the Shared Infrastructure section changed to "No-Limit Hold'em" on first use throughout all documents.
- **Strategy list flagged as abbreviated:** The 21-entry JoB strategy list now notes "abbreviated — full list has ~30+ entries" with reference to complete version in strategy data files.
- **Double Bonus player-advantage note:** Added explicit callout that 100.17% return means the player has a mathematical edge — rare in casino games and a key educational point.
- **`HandResult` extended:** Added `fourOfAKindRank` and `kickerRank` fields for Bonus/Double Bonus/DDB pay table lookups.

---

## Open Questions

### Q1: Strategy Data Source

The strategy lookup tables need to be sourced from published references (Wizard of Odds, Bob Dancer). Should these be:
- (a) Hand-transcribed from published lists into JSON data files
- (b) Generated programmatically by running the brute-force EV calculator against all C(52,5) dealt hands and clustering the results

Option (b) is more work upfront but self-verifying — the strategy data and the EV calculator can't disagree because they're derived from the same computation. Option (a) is faster but requires the strategy-parity test to catch transcription errors.

**Current decision:** Option (a) for Phase 2 (get training working fast), verified by the strategy-parity test in Phase 4. Consider option (b) as a future enhancement or validation cross-check.

### Q2: Performance Envelope for Wild Card EV

The wild classifier is estimated at 2–5× slower per evaluation than the standard classifier. At 2.6M evaluations per hand, this could push total computation to 500ms–1.3s per hand. Is this acceptable for real-time use?

**Mitigation:** Web Worker offloading. Compute EV in a background thread, show a brief spinner or progress indicator. The player can still toggle holds while computation runs; the EV display updates when ready. If necessary, implement early termination for clearly suboptimal hold patterns.

### Q3: Hand Category Trainer — Constructed Deals

The Hand Category Trainer needs to deal hands that present specific decision scenarios (e.g., "low pair vs. four to a flush"). This requires constructing hands rather than dealing randomly. What's the best approach?

**Proposed:** Define each training category as a set of constraints (e.g., "hand must contain a low pair AND four to a flush"). The dealer picks cards satisfying the constraints, then fills remaining positions randomly. This is a constrained random deal, not a pre-built hand list — it produces variety while guaranteeing the target decision point.

### Q4: Convergence Viewer Performance at 1M+ Hands

At max speed with no animation, computing 1M hands involves 1M × (shuffle + deal + EV calculation for optimal hold) operations. Estimated time: 5–15 minutes depending on hardware. Is this acceptable?

**Mitigation:** For max-speed convergence runs, skip the full 32-option EV calculation. Instead, just compute the optimal hold (from the strategy lookup) and enumerate all draw outcomes for that one hold. This is ~50× faster than computing all 32 options. The return percentage is still exact — we're just not computing the EV of suboptimal holds.

### Q5: localStorage vs. No Persistence

Machine Scout scores and Hand Category Trainer progress currently use localStorage. Should we add an option to export/import this data, or is localStorage sufficient?

**Current decision:** localStorage is sufficient. This is a personal training tool. If the browser clears storage, the user starts fresh — not a significant loss. Export/import adds complexity with minimal benefit. Revisit if users request it.

---

## Gaps Remaining

1. **Full strategy data files:** The JSON strategy data for all 6 variants (8 sub-strategies counting Deuces Wild's 5) needs to be transcribed from published sources. This is a data entry task, not a design task.

2. **Card visual design:** The design documents describe card behavior (hold toggles, animations, accessibility) but not the specific visual design of the card faces. Nuxt UI provides a component framework but not playing card graphics. Options: CSS-only card rendering, SVG card faces, or a lightweight card image library.

3. **Responsive breakpoints:** "Responsive design, mobile playable" is a requirement but specific breakpoints and mobile layout adaptations aren't specified. The machine layout (pay table → cards → controls stacked vertically) should adapt naturally, but the training panel positioning on small screens needs design attention.

4. **Sound effects:** Not mentioned anywhere. Real video poker machines have distinctive sounds (deal, hold toggle, draw, win). Optional audio with a mute toggle would enhance the "sitting at a machine" feel. Not critical — visual-only is fine for a training tool.
