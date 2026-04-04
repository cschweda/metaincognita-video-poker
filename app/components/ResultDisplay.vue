<script setup lang="ts">
const game = useGameStore()

const isWin = computed(() => game.resultPayout > 0)
</script>

<template>
  <div
    role="status"
    aria-live="polite"
    class="result-display"
  >
    <Transition name="result-pop">
      <div
        v-if="game.resultHandName !== null || game.phase === 'result'"
        class="result-display__text"
        :class="{
          'result-display__text--win': isWin,
          'result-display__text--loss': !isWin && game.phase === 'result',
        }"
      >
        <template v-if="isWin">
          &#9473;&#9473; {{ game.resultHandName }} &mdash; ${{ (game.resultPayout * game.denomination).toFixed(2) }} &#9473;&#9473;
        </template>
        <template v-else-if="game.phase === 'result'">
          No Win
        </template>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.result-display {
  text-align: center;
  min-height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Fira Code', monospace;
}

.result-display__text {
  font-size: clamp(0.8rem, 2.2vw, 1.2rem);
  font-weight: 700;
  letter-spacing: 0.06em;
}

.result-display__text--win {
  color: #ffd60a;
  text-shadow: 0 0 16px rgba(255, 214, 10, 0.4);
  animation: pop 0.3s ease-out;
}

.result-display__text--loss {
  color: rgba(170, 170, 200, 0.3);
}

.result-pop-enter-active {
  animation: pop 0.3s ease-out;
}

@keyframes pop {
  0% { transform: scale(0.92); opacity: 0.5; }
  50% { transform: scale(1.03); }
  100% { transform: scale(1); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .result-display__text--win,
  .result-pop-enter-active {
    animation-duration: 0.01ms !important;
  }
}
</style>
