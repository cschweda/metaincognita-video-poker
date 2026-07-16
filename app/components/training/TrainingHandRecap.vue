<script setup lang="ts">
import { cardLabel } from '~/utils/cards'
import { optimalHoldReason } from '~/utils/optimalPlayText'

// Result-phase step-by-step recap of the last hand: dealt → held →
// (optimal, if different) → final, plus mistake cost and the verdict badge.
const game = useGameStore()

const entry = computed(() => game.handHistory[0] ?? null)

const playerRank = computed(() => {
  if (!game.playerAnalysis) return -1
  return game.allHoldOptions.findIndex(opt =>
    opt.heldIndices.length === game.playerAnalysis!.heldIndices.length
    && opt.heldIndices.every(idx => game.playerAnalysis!.heldIndices.includes(idx))
  ) + 1
})

const reason = computed(() =>
  optimalHoldReason(game.optimalPlay, game.allHoldOptions)
)
</script>

<template>
  <div v-if="entry">
    <div class="thr">
      <!-- Step 1: Dealt -->
      <div class="thr__step">
        <span class="thr__num">1</span>
        <div>
          <div class="thr__label">
            Dealt
          </div>
          <div class="thr__cards">
            {{ entry.dealtCards.map(c => cardLabel(c)).join('  ') }}
          </div>
        </div>
      </div>

      <!-- Step 2: Your holds -->
      <div class="thr__step">
        <span class="thr__num">2</span>
        <div>
          <div class="thr__label">
            You held
          </div>
          <div class="thr__cards">
            {{ entry.playerHeld.length > 0
              ? entry.playerHeld.map(i => cardLabel(entry!.dealtCards[i]!)).join('  ')
              : 'Nothing (drew 5 new cards)' }}
          </div>
          <div class="thr__ev">
            EV: {{ entry.playerEV.toFixed(4) }}
          </div>
        </div>
      </div>

      <!-- Step 2b: Optimal (if different) -->
      <div
        v-if="!game.wasOptimal"
        class="thr__step thr__step--optimal"
      >
        <span class="thr__num thr__num--optimal">&#10148;</span>
        <div>
          <div class="thr__label thr__label--optimal">
            Optimal was
          </div>
          <div class="thr__cards thr__cards--optimal">
            {{ entry.optimalHeld.length > 0
              ? entry.optimalHeld.map(i => cardLabel(entry!.dealtCards[i]!)).join('  ')
              : 'Nothing (draw 5 new cards)' }}
          </div>
          <div class="thr__ev thr__ev--optimal">
            EV: {{ entry.optimalEV.toFixed(4) }}
          </div>
          <div
            v-if="reason"
            class="thr__reason"
          >
            {{ reason }}
          </div>
        </div>
      </div>

      <!-- Step 3: Result -->
      <div class="thr__step">
        <span class="thr__num">3</span>
        <div>
          <div class="thr__label">
            Final hand
          </div>
          <div class="thr__cards">
            {{ entry.finalCards.map(c => cardLabel(c)).join('  ') }}
          </div>
          <div
            class="thr__result"
            :class="entry.payout > 0 ? 'thr__result--win' : 'thr__result--loss'"
          >
            {{ entry.handResult || 'No Win' }}
            <span v-if="entry.payout > 0"> &mdash; +${{ (entry.payout * game.denomination).toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Mistake cost -->
    <div
      v-if="!game.wasOptimal"
      class="thr-mistake-cost"
    >
      Cost of mistake: <strong>${{ game.lastMistakeCost.toFixed(2) }}</strong>
      <span class="thr-rank">(your play ranked #{{ playerRank }} of 32)</span>
    </div>

    <!-- Verdict badge: only claim a verdict once this hand's analysis landed -->
    <div class="thr-verdict-row">
      <span
        v-if="game.playerAnalysis"
        class="thr-verdict"
        :class="game.wasOptimal ? 'thr-verdict--correct' : 'thr-verdict--mistake'"
      >
        {{ game.wasOptimal ? 'OPTIMAL PLAY' : 'MISTAKE' }}
      </span>
      <span
        v-else-if="game.analysisError"
        class="thr-verdict thr-verdict--pending"
      >
        ANALYSIS UNAVAILABLE
      </span>
      <span
        v-else
        class="thr-verdict thr-verdict--pending"
      >
        EVALUATING&hellip;
      </span>
    </div>
  </div>
</template>

<style scoped>
.thr {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.thr__step {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.thr__step--optimal {
  background: rgba(127, 29, 29, 0.2);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: 6px;
  padding: 6px 8px;
  margin-left: 24px;
}

.thr__num {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(55, 65, 81, 0.4);
  color: #9ca3af;
  font-size: 0.65rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

.thr__num--optimal {
  background: rgba(248, 113, 113, 0.3);
  color: var(--vp-loss);
  width: auto;
  height: auto;
  border-radius: 0;
  font-size: 0.75rem;
}

.thr__label {
  font-size: 0.65rem;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.thr__label--optimal {
  color: var(--vp-loss);
}

.thr__cards {
  font-family: 'Fira Code', monospace;
  font-size: 0.78rem;
  font-weight: 600;
  color: #e2e8f0;
  margin-top: 1px;
  letter-spacing: 0.02em;
}

.thr__cards--optimal {
  color: var(--vp-win);
}

.thr__ev {
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
  color: #6b7280;
  margin-top: 1px;
}

.thr__ev--optimal {
  color: var(--vp-win);
}

.thr__result {
  font-size: 0.78rem;
  font-weight: 700;
  margin-top: 2px;
}

.thr__result--win {
  color: var(--vp-win);
}

.thr__result--loss {
  color: #6b7280;
}

.thr__reason {
  font-size: 0.68rem;
  color: var(--vp-win);
  font-style: italic;
  margin-top: 3px;
  line-height: 1.4;
}

.thr-mistake-cost {
  margin-top: 6px;
  font-size: 0.8rem;
  color: var(--vp-loss);
  background: rgba(127, 29, 29, 0.2);
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid rgba(248, 113, 113, 0.3);
}

.thr-mistake-cost strong {
  font-family: 'Fira Code', monospace;
}

.thr-rank {
  color: #6b7280;
  font-size: 0.72rem;
}

.thr-verdict-row {
  margin-top: 8px;
  margin-bottom: 8px;
}

.thr-verdict {
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 3px 12px;
  border-radius: 4px;
  font-family: 'Fira Code', monospace;
}

.thr-verdict--correct {
  background: rgba(22, 101, 52, 0.2);
  color: var(--vp-win);
}

.thr-verdict--mistake {
  background: rgba(127, 29, 29, 0.2);
  color: var(--vp-loss);
}

.thr-verdict--pending {
  background: rgba(85, 96, 160, 0.15);
  color: #8f96bd;
}
</style>
