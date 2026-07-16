<script setup lang="ts">
import { formatHeldCards, buildDisplayDistribution } from '~/utils/evCalculator'

// Live EV + outcome distribution for the player's current hold selection.
const game = useGameStore()

// One row per pay-table hand + "Nothing", always — a constant row count
// keeps the panel height stable while toggling holds, so the page never
// reflows (no scrollbar flicker / window zig-zag).
const displayDistribution = computed(() => {
  const analysis = game.currentHoldAnalysis
  if (!analysis) return []
  return buildDisplayDistribution(analysis.handDistribution, game.payTable)
})

const isOptimalSelection = computed(() => {
  if (!game.currentHoldAnalysis || !game.optimalPlay) return false
  return Math.abs(game.currentHoldAnalysis.expectedValue - game.optimalPlay.expectedValue) < 0.0001
})
</script>

<template>
  <div>
    <template v-if="game.currentHoldAnalysis">
      <div class="tcs-hold">
        <div class="tcs-hold__cards">
          {{ formatHeldCards(game.currentHoldAnalysis) }}
        </div>
        <div class="tcs-hold__ev">
          EV: {{ game.currentHoldAnalysis.expectedValue.toFixed(4) }}
          <span
            v-if="game.optimalPlay"
            class="tcs-hold__delta"
            :class="isOptimalSelection ? 'tcs-hold__delta--optimal' : 'tcs-hold__delta--sub'"
          >
            <template v-if="isOptimalSelection">
              &#10003; Optimal
            </template>
            <template v-else>
              {{ (game.currentHoldAnalysis.expectedValue - game.optimalPlay.expectedValue).toFixed(4) }} vs optimal
            </template>
          </span>
        </div>
      </div>

      <!-- Outcome probabilities -->
      <div class="tcs-dist">
        <div class="tcs-dist__title">
          Draw Outcomes
        </div>
        <div
          v-for="row in displayDistribution"
          :key="row.name"
          class="tcs-dist__row"
          :class="{ 'tcs-dist__row--nil': row.prob < 0.0005 }"
        >
          <span class="tcs-dist__hand">{{ row.name }}</span>
          <div class="tcs-dist__bar-bg">
            <div
              class="tcs-dist__bar"
              :class="{ 'tcs-dist__bar--win': row.name !== 'Nothing' }"
              :style="{ width: (row.prob * 100) + '%' }"
            />
          </div>
          <span class="tcs-dist__pct">{{ (row.prob * 100).toFixed(1) }}%</span>
        </div>
      </div>
    </template>
    <div
      v-else
      class="tcs-empty"
    >
      No cards held — will draw 5 new cards
    </div>
  </div>
</template>

<style scoped>
.tcs-hold {
  margin-bottom: 10px;
}

.tcs-hold__cards {
  font-family: 'Fira Code', monospace;
  font-weight: 700;
  font-size: 0.85rem;
  color: #e2e8f0;
}

.tcs-hold__ev {
  font-family: 'Fira Code', monospace;
  font-size: 0.72rem;
  color: #6b7280;
  margin-top: 2px;
}

.tcs-hold__delta {
  margin-left: 6px;
  font-weight: 700;
}

.tcs-hold__delta--optimal {
  color: var(--vp-win);
}

.tcs-hold__delta--sub {
  color: var(--vp-loss);
}

.tcs-empty {
  font-size: 0.78rem;
  color: #6b7280;
  font-style: italic;
}

/* Outcome distribution bars */
.tcs-dist {
  margin-top: 4px;
}

.tcs-dist__title {
  font-size: 0.6rem;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 4px;
}

.tcs-dist__row {
  display: grid;
  grid-template-columns: 110px 1fr 42px;
  gap: 6px;
  align-items: center;
  padding: 1px 0;
  font-size: 0.68rem;
}

/* Outcomes that are (near-)impossible for the current hold stay in the
   list at fixed positions — dimmed, so the live outcomes stand out. */
.tcs-dist__row--nil {
  opacity: 0.35;
}

.tcs-dist__hand {
  font-family: 'Fira Code', monospace;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tcs-dist__bar-bg {
  height: 10px;
  background: rgba(55, 65, 81, 0.4);
  border-radius: 3px;
  overflow: hidden;
}

.tcs-dist__bar {
  height: 100%;
  background: rgba(129, 140, 248, 0.4);
  border-radius: 3px;
  min-width: 1px;
  transition: width 0.2s ease;
}

.tcs-dist__bar--win {
  background: var(--vp-win);
}

.tcs-dist__pct {
  font-family: 'Fira Code', monospace;
  color: #9ca3af;
  text-align: right;
  font-size: 0.62rem;
}
</style>
