<script setup lang="ts">
const game = useGameStore()

const tableFlash = ref(false)

// Watch for pay table changes and trigger flash
watch(() => game.payTableId, () => {
  tableFlash.value = true
  setTimeout(() => { tableFlash.value = false }, 500)
})
</script>

<template>
  <div class="pay-table-wrapper" :class="{ 'pay-table-wrapper--flash': tableFlash }">
    <table class="pay-table" aria-label="Pay table">
      <thead>
        <tr>
          <th class="pay-table__hand-header">HAND</th>
          <th
            v-for="c in [1, 2, 3, 4, 5]"
            :key="c"
            class="pay-table__coin-header"
            :class="{ 'pay-table__coin-header--active': c === game.coinsBet }"
          >
            {{ c }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(hand, i) in game.payTable.hands"
          :key="hand.name"
          class="pay-table__row"
          :class="{ 'pay-table__row--winner': game.winningRowIndex === i }"
          :aria-current="game.winningRowIndex === i ? 'true' : undefined"
        >
          <td class="pay-table__hand-name">{{ hand.name }}</td>
          <td
            v-for="(pay, j) in hand.pays"
            :key="j"
            class="pay-table__pay"
            :class="{
              'pay-table__pay--active-col': j + 1 === game.coinsBet,
              'pay-table__pay--winner': game.winningRowIndex === i && j + 1 === game.coinsBet,
            }"
          >
            {{ pay }}
          </td>
        </tr>
      </tbody>
    </table>

    <div class="pay-table__return">
      <span :class="{ 'pay-table__return--positive': game.payTable.returnPct >= 100 }">
        Return: {{ game.payTable.returnPct }}%
        <template v-if="game.payTable.returnPct >= 100"> &#10022; Player Advantage</template>
      </span>
      <span v-if="game.coinsBet < 5" class="pay-table__return--warning">
        &#9888; Royal Flush bonus requires max coins
      </span>
    </div>
  </div>
</template>

<style scoped>
.pay-table-wrapper {
  background: linear-gradient(180deg, #1a1a34, #20203a);
  border-radius: 8px;
  padding: clamp(6px, 1.5vw, 12px);
  border: 1px solid #28284a;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.3);
  overflow: auto;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.pay-table-wrapper--flash {
  border-color: #c9a227;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 20px rgba(201, 162, 39, 0.3);
  animation: table-flash 0.5s ease;
}

@keyframes table-flash {
  0% { border-color: #c9a227; box-shadow: inset 0 2px 8px rgba(0,0,0,.3), 0 0 30px rgba(201,162,39,.5); }
  100% { border-color: #28284a; box-shadow: inset 0 2px 8px rgba(0,0,0,.3); }
}

@media (prefers-reduced-motion: reduce) {
  .pay-table-wrapper--flash {
    animation-duration: 0.01ms !important;
  }
}

.pay-table {
  width: 100%;
  border-collapse: collapse;
  font-size: clamp(0.48rem, 1.35vw, 0.75rem);
  color: #aab0d8;
  font-family: 'Fira Code', monospace;
}

.pay-table__hand-header {
  text-align: left;
  padding: 2px 6px;
  color: #5560a0;
  font-weight: 400;
  font-size: 0.85em;
}

.pay-table__coin-header {
  text-align: center;
  padding: 2px 3px;
  min-width: 36px;
  color: #5560a0;
  font-weight: 400;
  font-size: 0.85em;
}

.pay-table__coin-header--active {
  color: #ffd60a;
  font-weight: 700;
  background: rgba(201, 162, 39, 0.05);
}

.pay-table__row {
  transition: background 0.3s;
}

.pay-table__row--winner {
  background: rgba(201, 162, 39, 0.18);
  animation: winner-pulse 0.6s ease;
}

.pay-table__hand-name {
  padding: 2px 6px;
  white-space: nowrap;
  font-weight: 400;
  color: #aab0d8;
}

.pay-table__row--winner .pay-table__hand-name {
  font-weight: 700;
  color: #ffd60a;
  text-shadow: 0 0 8px rgba(255, 214, 10, 0.4);
}

.pay-table__pay {
  text-align: center;
  padding: 2px 3px;
  font-weight: 400;
  color: #6670a0;
}

.pay-table__pay--active-col {
  font-weight: 700;
  color: #dde0ff;
  background: rgba(201, 162, 39, 0.03);
}

.pay-table__pay--winner {
  color: #ffd60a;
  font-weight: 700;
  text-shadow: 0 0 6px rgba(255, 214, 10, 0.5);
}

.pay-table__return {
  margin-top: 5px;
  font-size: 0.62rem;
  text-align: center;
  color: #5560a0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-family: 'Fira Code', monospace;
}

.pay-table__return--positive {
  color: #4ade80;
}

.pay-table__return--warning {
  color: #f87171;
  background: rgba(248, 113, 113, 0.07);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid rgba(248, 113, 113, 0.12);
}

@keyframes winner-pulse {
  0%, 100% { background: rgba(201, 162, 39, 0.18); }
  50% { background: rgba(201, 162, 39, 0.35); }
}

@media (prefers-reduced-motion: reduce) {
  .pay-table__row--winner {
    animation-duration: 0.01ms !important;
  }
}
</style>
