<script setup lang="ts">
import { cardLabel } from '~/utils/cards'

// Scrolling per-hand history inside the training panel.
const game = useGameStore()
</script>

<template>
  <div class="thl">
    <div
      v-for="entry in game.handHistory"
      :key="entry.handNumber"
      class="thl-entry"
      :class="{ 'thl-entry--mistake': entry.mistakeCost > 0.001 }"
    >
      <div class="thl-header">
        <span class="thl-num">#{{ entry.handNumber }}</span>
        <span
          v-if="entry.handResult"
          class="thl-result"
        >{{ entry.handResult }}</span>
        <span
          v-else
          class="thl-result thl-result--loss"
        >No Win</span>
        <span
          class="thl-payout"
          :class="entry.payout > 0 ? '' : 'thl-payout--loss'"
        >
          {{ entry.payout > 0 ? '+' : '-' }}${{ ((entry.payout > 0 ? entry.payout : game.coinsBet) * game.denomination).toFixed(2) }}
        </span>
      </div>
      <div class="thl-cards">
        Dealt: {{ entry.dealtCards.map(c => cardLabel(c)).join(' ') }}
      </div>
      <div class="thl-cards">
        Held: {{ entry.playerHeld.length > 0 ? entry.playerHeld.map(i => cardLabel(entry.dealtCards[i]!)).join(' ') : 'nothing' }}
      </div>
      <div
        v-if="entry.mistakeCost > 0.001"
        class="thl-mistake"
      >
        Optimal: {{ entry.optimalHeld.map(i => cardLabel(entry.dealtCards[i]!)).join(' ') || 'nothing' }}
        &middot; Cost: ${{ entry.mistakeCost.toFixed(2) }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.thl {
  margin-top: 8px;
  max-height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.thl-entry {
  padding: 6px 8px;
  background: rgba(31, 41, 55, 0.4);
  border-radius: 4px;
  border: 1px solid rgba(55, 65, 81, 0.4);
}

.thl-entry--mistake {
  border-color: rgba(248, 113, 113, 0.3);
  background: rgba(127, 29, 29, 0.15);
}

.thl-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 0.78rem;
}

.thl-num {
  font-family: 'Fira Code', monospace;
  color: #6b7280;
  font-size: 0.7rem;
}

.thl-result {
  font-weight: 700;
  color: #e2e8f0;
}

.thl-result--loss {
  color: #6b7280;
  font-weight: 400;
}

.thl-payout {
  font-family: 'Fira Code', monospace;
  color: var(--vp-win);
  font-weight: 700;
  font-size: 0.72rem;
  margin-left: auto;
}

.thl-payout--loss {
  color: var(--vp-loss);
}

.thl-cards {
  font-family: 'Fira Code', monospace;
  font-size: 0.68rem;
  color: #9ca3af;
  margin-top: 2px;
}

.thl-mistake {
  font-size: 0.72rem;
  color: var(--vp-loss);
  margin-top: 4px;
  padding: 3px 6px;
  background: rgba(127, 29, 29, 0.2);
  border-radius: 3px;
}
</style>
