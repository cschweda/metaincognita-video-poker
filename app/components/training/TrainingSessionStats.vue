<script setup lang="ts">
// Session stat grid: hands / mistakes / EV lost / return.
const game = useGameStore()
</script>

<template>
  <div class="tss-grid">
    <div class="tss-stat">
      <span class="tss-stat__value">{{ game.stats.handsPlayed }}</span>
      <span class="tss-stat__label">Hands</span>
    </div>
    <div class="tss-stat">
      <span
        class="tss-stat__value"
        :class="game.stats.totalMistakes > 0 ? 'tss-stat__value--bad' : 'tss-stat__value--good'"
      >
        {{ game.stats.totalMistakes }}
      </span>
      <span class="tss-stat__label">Mistakes</span>
    </div>
    <div class="tss-stat">
      <span
        class="tss-stat__value"
        :class="game.stats.totalEVLost > 0 ? 'tss-stat__value--bad' : 'tss-stat__value--good'"
      >
        ${{ game.stats.totalEVLost.toFixed(2) }}
      </span>
      <span class="tss-stat__label">EV Lost</span>
    </div>
    <div class="tss-stat">
      <span class="tss-stat__value">
        {{ game.effectiveReturn.toFixed(1) }}%
      </span>
      <span class="tss-stat__label">Return</span>
    </div>
  </div>
</template>

<style scoped>
.tss-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  text-align: center;
}

.tss-stat__value {
  display: block;
  font-family: 'Fira Code', monospace;
  font-size: 1rem;
  font-weight: 700;
  color: #e2e8f0;
}

.tss-stat__value--bad {
  color: var(--vp-loss);
}

.tss-stat__value--good {
  color: var(--vp-win);
}

.tss-stat__label {
  display: block;
  font-size: 0.65rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
