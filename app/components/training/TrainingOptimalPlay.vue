<script setup lang="ts">
import { optimalHoldDescription, optimalHoldReason } from '~/utils/optimalPlayText'

// Dealt-phase OPTIMAL PLAY headline: what to hold, its EV, and why.
const game = useGameStore()

const description = computed(() =>
  optimalHoldDescription(game.optimalPlay, game.payTable.classifier === 'deucesWild')
)

const reason = computed(() =>
  optimalHoldReason(game.optimalPlay, game.allHoldOptions)
)
</script>

<template>
  <div>
    <div class="top-description">
      {{ description }}
    </div>
    <div class="top-ev">
      EV: {{ game.optimalPlay?.expectedValue.toFixed(4) ?? '—' }}
    </div>
    <div
      v-if="reason"
      class="top-reason"
    >
      {{ reason }}
    </div>
  </div>
</template>

<style scoped>
.top-description {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--vp-win);
  padding: 8px 12px;
  background: rgba(22, 101, 52, 0.2);
  border-radius: 6px;
  border: 1px solid rgba(74, 222, 128, 0.3);
}

.top-ev {
  font-family: 'Fira Code', monospace;
  font-size: 0.72rem;
  color: #6b7280;
  margin-top: 4px;
}

.top-reason {
  font-size: 0.72rem;
  color: #9ca3af;
  margin-top: 6px;
  line-height: 1.4;
  font-style: italic;
}
</style>
