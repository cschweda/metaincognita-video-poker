<script setup lang="ts">
// Win/loss banner at the top of the result phase.
const game = useGameStore()
</script>

<template>
  <div
    class="trb"
    :class="game.resultPayout > 0 ? 'trb--win' : 'trb--loss'"
  >
    <div class="trb__icon">
      {{ game.resultPayout > 0 ? '&#10004;' : '&#10006;' }}
    </div>
    <div>
      <div class="trb__hand">
        {{ game.resultHandName || 'No Win' }}
      </div>
      <div
        v-if="game.resultPayout > 0"
        class="trb__payout"
      >
        Won ${{ (game.resultPayout * game.denomination).toFixed(2) }}
        <span class="trb__net">(net +${{ ((game.resultPayout - game.coinsBet) * game.denomination).toFixed(2) }})</span>
      </div>
      <div
        v-else
        class="trb__payout trb__payout--loss"
      >
        Lost ${{ game.betAsDollars }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.trb {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
}

.trb--win {
  background: rgba(22, 101, 52, 0.2);
  border: 2px solid rgba(74, 222, 128, 0.3);
}

.trb--loss {
  background: rgba(127, 29, 29, 0.2);
  border: 2px solid rgba(248, 113, 113, 0.3);
}

.trb__icon {
  font-size: 1.5rem;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.trb--win .trb__icon {
  background: var(--vp-win);
  color: #052e16;
}

.trb--loss .trb__icon {
  background: #fca5a5;
  color: #7f1d1d;
}

.trb__hand {
  font-family: 'Fira Code', monospace;
  font-size: 1rem;
  font-weight: 700;
}

.trb--win .trb__hand {
  color: var(--vp-win);
}

.trb--loss .trb__hand {
  color: var(--vp-loss);
}

.trb__payout {
  font-family: 'Fira Code', monospace;
  font-size: 0.78rem;
  font-weight: 600;
  margin-top: 2px;
  color: var(--vp-win);
}

.trb__payout--loss {
  color: var(--vp-loss);
}

.trb__net {
  font-size: 0.68rem;
  font-weight: 400;
  color: var(--vp-win);
  margin-left: 4px;
}
</style>
