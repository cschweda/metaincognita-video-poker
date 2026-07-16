<script setup lang="ts">
// Session balance sparkline with per-hand dots, extracted from BankrollPanel.
// The dots are real buttons so their tooltips open on keyboard focus, not
// just hover — the per-hand recap is teaching content, not decoration.
const game = useGameStore()

interface SparkPoint {
  x: number
  y: number
  balance: number
  handNum: number
  payout: number
  handResult: string | null
  isWin: boolean
}

const WIDTH = 240
const HEIGHT = 40

const sparkData = computed<SparkPoint[]>(() => {
  if (game.handHistory.length < 2) return []
  const history = [...game.handHistory].reverse()
  const startBalance = 100
  let balance = startBalance
  const points: { balance: number, handNum: number, payout: number, handResult: string | null }[] = [
    { balance, handNum: 0, payout: 0, handResult: null }
  ]

  for (const h of history) {
    balance = balance - game.coinsBet + h.payout
    points.push({ balance, handNum: h.handNumber, payout: h.payout, handResult: h.handResult })
  }

  const balances = points.map(p => p.balance)
  const min = Math.min(...balances)
  const max = Math.max(...balances)
  const range = max - min || 1
  const step = WIDTH / (points.length - 1)

  return points.map((p, i) => ({
    x: i * step,
    y: HEIGHT - ((p.balance - min) / range) * HEIGHT,
    balance: p.balance,
    handNum: p.handNum,
    payout: p.payout,
    handResult: p.handResult,
    isWin: p.payout > 0
  }))
})

const sparklinePoints = computed(() =>
  sparkData.value.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
)

const netResult = computed(() =>
  (game.stats.totalReturned - game.stats.totalWagered) * game.denomination
)

const sparklineColor = computed(() =>
  netResult.value >= 0 ? 'var(--vp-win)' : 'var(--vp-loss)'
)

const sparklineZeroY = computed(() => {
  if (sparkData.value.length === 0) return '20'
  const startBalance = 100
  const balances = sparkData.value.map(p => p.balance)
  const min = Math.min(...balances)
  const max = Math.max(...balances)
  const range = max - min || 1
  return (HEIGHT - ((startBalance - min) / range) * HEIGHT).toFixed(1)
})

function dotLabel(pt: SparkPoint): string {
  if (pt.handNum === 0) {
    return `Start: $${(pt.balance * game.denomination).toFixed(2)}`
  }
  const swing = `${pt.isWin ? '+' : '-'}$${((pt.isWin ? pt.payout : game.coinsBet) * game.denomination).toFixed(2)}`
  return `#${pt.handNum}: ${pt.handResult || 'No Win'} ${swing} → $${(pt.balance * game.denomination).toFixed(2)}`
}
</script>

<template>
  <div
    v-if="sparkData.length >= 2"
    class="bp-sparkline"
  >
    <svg
      :viewBox="`0 -4 ${WIDTH} ${HEIGHT + 8}`"
      preserveAspectRatio="none"
      class="bp-sparkline__svg"
      aria-hidden="true"
    >
      <!-- Zero/starting line -->
      <line
        x1="0"
        :y1="sparklineZeroY"
        :x2="WIDTH"
        :y2="sparklineZeroY"
        stroke="#334155"
        stroke-width="0.5"
        stroke-dasharray="3 2"
      />
      <!-- Balance line -->
      <polyline
        :points="sparklinePoints"
        :stroke="sparklineColor"
        stroke-width="1.5"
        fill="none"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
    </svg>
    <!-- Dots overlay (HTML buttons for tooltip + keyboard support) -->
    <div class="bp-sparkline__dots">
      <UTooltip
        v-for="(pt, i) in sparkData"
        :key="i"
        :text="dotLabel(pt)"
      >
        <button
          type="button"
          class="bp-sparkline__dot"
          :class="{
            'bp-sparkline__dot--win': pt.isWin && pt.handNum > 0,
            'bp-sparkline__dot--loss': !pt.isWin && pt.handNum > 0,
            'bp-sparkline__dot--start': pt.handNum === 0
          }"
          :style="{
            left: `${(pt.x / WIDTH) * 100}%`,
            top: `${((pt.y + 4) / (HEIGHT + 8)) * 100}%`
          }"
          :aria-label="dotLabel(pt)"
        />
      </UTooltip>
    </div>
  </div>
</template>

<style scoped>
.bp-sparkline {
  padding: 4px 0;
  position: relative;
}

.bp-sparkline__svg {
  width: 100%;
  height: 48px;
  display: block;
}

.bp-sparkline__dots {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.bp-sparkline__dot {
  position: absolute;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  border: none;
  padding: 0;
  transform: translate(-50%, -50%);
  pointer-events: auto;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s;
  opacity: 0.7;
}

.bp-sparkline__dot:hover,
.bp-sparkline__dot:focus-visible {
  transform: translate(-50%, -50%) scale(1.8);
  opacity: 1;
  z-index: 10;
}

.bp-sparkline__dot:focus-visible {
  outline: 2px solid var(--vp-gold-bright);
  outline-offset: 1px;
}

.bp-sparkline__dot--win {
  background: var(--vp-win);
  box-shadow: 0 0 4px rgba(74, 222, 128, 0.4);
}

.bp-sparkline__dot--loss {
  background: var(--vp-loss);
  box-shadow: 0 0 4px rgba(248, 113, 113, 0.4);
}

.bp-sparkline__dot--start {
  background: #6b7280;
  width: 5px;
  height: 5px;
}

@media (prefers-reduced-motion: reduce) {
  .bp-sparkline__dot {
    transition-duration: 0.01ms;
  }
}
</style>
