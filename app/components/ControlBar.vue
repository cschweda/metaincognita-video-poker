<script setup lang="ts">
const game = useGameStore()

const dealDrawLabel = computed(() => {
  if (game.phase === 'dealt') return 'DRAW'
  return 'DEAL'
})

const isActionDisabled = computed(() => {
  if (game.phase === 'dealing' || game.phase === 'drawing') return true
  if (game.phase === 'dealt') return false // can always draw
  // idle or result: need enough credits to deal
  return game.credits < game.coinsBet
})
</script>

<template>
  <div class="control-bar">
    <!-- Buttons row -->
    <div class="control-bar__buttons">
      <button
        class="ctrl-btn"
        :disabled="!game.canBet"
        @click="game.incrementBet()"
      >
        BET ONE
      </button>

      <button
        class="ctrl-btn"
        :disabled="!game.canBet"
        @click="game.betMax()"
      >
        BET MAX
      </button>

      <button
        class="ctrl-btn ctrl-btn--primary"
        :disabled="isActionDisabled"
        @click="game.dealOrDraw()"
      >
        {{ dealDrawLabel }}
      </button>
    </div>

    <!-- Credit readout -->
    <div class="control-bar__credits">
      <span>CREDITS {{ game.credits }}</span>
      <span>WON {{ game.stats.handsWon }}/{{ game.stats.handsPlayed }}</span>
      <span>BET {{ game.coinsBet }}&times;${{ game.denomination.toFixed(2) }} = ${{ game.betAsDollars }}</span>
    </div>

    <!-- Max coin warning -->
    <div
      v-if="game.coinsBet < 5 && game.canBet"
      class="control-bar__warning"
    >
      &#9888; Royal Flush bonus requires max coins &mdash; return drops ~1.5%
    </div>

    <!-- Insert credits -->
    <div v-if="game.credits < game.coinsBet" class="control-bar__insert">
      <button
        class="ctrl-btn"
        @click="game.insertCredits()"
      >
        INSERT CREDITS
      </button>
    </div>
  </div>
</template>

<style scoped>
.control-bar {
  background: rgba(0, 0, 0, 0.25);
  border-radius: 8px;
  padding: clamp(8px, 1.8vw, 14px);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-bar__buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

/* Base button */
.ctrl-btn {
  background: linear-gradient(180deg, #3a3a5e, #2a2a4e);
  border: 1px solid #4a4a6e;
  border-radius: 6px;
  color: #e0e0ff;
  padding: 9px 18px;
  font-size: 0.76rem;
  font-weight: 700;
  font-family: 'Fira Code', 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  box-shadow: 0 3px 0 #1a1a2e, 0 4px 8px rgba(0, 0, 0, 0.25);
  transition: transform 0.1s, box-shadow 0.1s, opacity 0.15s;
}

.ctrl-btn:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: 0 1px 0 #1a1a2e, 0 2px 4px rgba(0, 0, 0, 0.25);
}

.ctrl-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.ctrl-btn:focus-visible {
  outline: 2px solid #ffd60a;
  outline-offset: 2px;
}

/* Primary button (Deal/Draw) */
.ctrl-btn--primary {
  background: linear-gradient(180deg, #c9a227, #a88520);
  color: #1a1a2e;
  font-size: 0.95rem;
  padding: 11px 36px;
  box-shadow: 0 3px 0 #6b5510, 0 0 16px rgba(201, 162, 39, 0.2), 0 4px 8px rgba(0, 0, 0, 0.25);
}

.ctrl-btn--primary:active:not(:disabled) {
  box-shadow: 0 1px 0 #6b5510, 0 0 8px rgba(201, 162, 39, 0.2), 0 2px 4px rgba(0, 0, 0, 0.25);
}

/* Credit display */
.control-bar__credits {
  display: flex;
  justify-content: space-between;
  font-size: clamp(0.58rem, 1.3vw, 0.78rem);
  color: #4ade80;
  text-shadow: 0 0 6px rgba(74, 222, 128, 0.2);
  padding: 2px 4px;
  flex-wrap: wrap;
  gap: 4px;
  font-family: 'Fira Code', monospace;
  letter-spacing: 0.08em;
}

/* Warning */
.control-bar__warning {
  font-size: 0.62rem;
  color: #f87171;
  text-align: center;
  background: rgba(248, 113, 113, 0.07);
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid rgba(248, 113, 113, 0.12);
  font-family: 'Fira Code', monospace;
}

.control-bar__insert {
  text-align: center;
}
</style>
