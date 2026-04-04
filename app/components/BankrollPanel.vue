<script setup lang="ts">
const game = useGameStore()
const rulesOpen = ref(false)

function scrollToComparison() {
  const el = document.getElementById('bot-comparison')
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const returnColor = computed(() => {
  if (game.stats.handsPlayed === 0) return ''
  if (game.effectiveReturn >= 99) return 'bp-value--good'
  if (game.effectiveReturn >= 96) return 'bp-value--neutral'
  return 'bp-value--bad'
})

const netResult = computed(() => {
  const net = game.stats.totalReturned - game.stats.totalWagered
  return net * game.denomination
})

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

const sparklineColor = computed(() =>
  netResult.value >= 0 ? '#4ade80' : '#f87171'
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
</script>

<template>
  <div class="bankroll-panel">
    <!-- Bankroll -->
    <div class="bp-section">
      <div class="bp-label">BALANCE</div>
      <div class="bp-value bp-value--large">${{ game.creditsAsDollars }}</div>
    </div>

    <!-- Current bet -->
    <div class="bp-section">
      <div class="bp-label">BET</div>
      <div class="bp-value">${{ game.betAsDollars }} / hand</div>
    </div>

    <div class="bp-divider" />

    <!-- Session summary -->
    <div class="bp-section">
      <div class="bp-label">SESSION</div>
      <UTooltip text="Total hands dealt this session.">
        <div class="bp-row">
          <span class="bp-row-label">Hands</span>
          <span class="bp-row-value">{{ game.stats.handsPlayed }}</span>
        </div>
      </UTooltip>
      <UTooltip text="Hands where you received a payout (Jacks or Better or higher).">
        <div class="bp-row">
          <span class="bp-row-label">Won</span>
          <span class="bp-row-value">{{ game.stats.handsWon }}</span>
        </div>
      </UTooltip>
      <UTooltip text="Total amount bet across all hands this session.">
        <div class="bp-row">
          <span class="bp-row-label">Wagered</span>
          <span class="bp-row-value">${{ (game.stats.totalWagered * game.denomination).toFixed(2) }}</span>
        </div>
      </UTooltip>
      <UTooltip text="Total payouts received. Includes your original bet on winning hands (video poker pays 'for 1', not 'to 1').">
        <div class="bp-row">
          <span class="bp-row-label">Returned</span>
          <span class="bp-row-value">${{ (game.stats.totalReturned * game.denomination).toFixed(2) }}</span>
        </div>
      </UTooltip>
      <UTooltip text="Returned minus Wagered. Positive = you're up. Negative = you're down.">
        <div class="bp-row">
          <span class="bp-row-label">Net</span>
          <span
            class="bp-row-value"
            :class="{
              'bp-value--good': netResult > 0,
              'bp-value--bad': netResult < 0,
            }"
          >
            {{ netResult >= 0 ? '+' : '' }}${{ netResult.toFixed(2) }}
          </span>
        </div>
      </UTooltip>
      <UTooltip
        v-if="game.stats.handsPlayed > 0"
        :text="`Your actual return: ${game.effectiveReturn.toFixed(2)}%. Theoretical optimal for this pay table: ${game.payTable.returnPct}%. The gap is variance + any mistakes.`"
      >
        <div class="bp-row">
          <span class="bp-row-label">Return</span>
          <span class="bp-row-value" :class="returnColor">
            {{ game.effectiveReturn.toFixed(1) }}%
          </span>
        </div>
      </UTooltip>
    </div>

    <!-- Sparkline with interactive dots -->
    <div v-if="sparkData.length >= 2" class="bp-sparkline">
      <svg :viewBox="`0 -4 ${WIDTH} ${HEIGHT + 8}`" preserveAspectRatio="none" class="bp-sparkline__svg">
        <!-- Zero/starting line -->
        <line x1="0" :y1="sparklineZeroY" :x2="WIDTH" :y2="sparklineZeroY" stroke="#334155" stroke-width="0.5" stroke-dasharray="3 2"/>
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
      <!-- Dots overlay (HTML for UTooltip support) -->
      <div class="bp-sparkline__dots">
        <UTooltip
          v-for="(pt, i) in sparkData"
          :key="i"
          :text="pt.handNum === 0
            ? `Start: $${(pt.balance * game.denomination).toFixed(2)}`
            : `#${pt.handNum}: ${pt.handResult || 'No Win'} ${pt.isWin ? '+' : '-'}$${((pt.isWin ? pt.payout : game.coinsBet) * game.denomination).toFixed(2)} → $${(pt.balance * game.denomination).toFixed(2)}`"
        >
          <div
            class="bp-sparkline__dot"
            :class="{
              'bp-sparkline__dot--win': pt.isWin && pt.handNum > 0,
              'bp-sparkline__dot--loss': !pt.isWin && pt.handNum > 0,
              'bp-sparkline__dot--start': pt.handNum === 0,
            }"
            :style="{
              left: `${(pt.x / WIDTH) * 100}%`,
              top: `${((pt.y + 4) / (HEIGHT + 8)) * 100}%`,
            }"
          />
        </UTooltip>
      </div>
    </div>

    <div class="bp-divider" />

    <!-- Mistakes -->
    <div class="bp-section">
      <div class="bp-label">MISTAKES</div>
      <UTooltip text="Hands where you held different cards than the mathematically optimal play. Zero mistakes = perfect play.">
        <div class="bp-row">
          <span class="bp-row-label">Count</span>
          <span
            class="bp-row-value"
            :class="game.stats.totalMistakes > 0 ? 'bp-value--bad' : 'bp-value--good'"
          >
            {{ game.stats.totalMistakes }}
          </span>
        </div>
      </UTooltip>
      <UTooltip text="The cumulative dollar cost of your mistakes. This is the money you left on the table by not playing optimally — the gap between your return and Perfect Pat's.">
        <div class="bp-row">
          <span class="bp-row-label">EV Lost</span>
          <span
            class="bp-row-value"
            :class="game.stats.totalEVLost > 0 ? 'bp-value--bad' : 'bp-value--good'"
          >
            ${{ game.stats.totalEVLost.toFixed(2) }}
          </span>
        </div>
      </UTooltip>
    </div>

    <!-- Last hand result (after draw) -->
    <template v-if="game.phase === 'result'">
      <div class="bp-divider" />
      <div class="bp-section">
        <div class="bp-label">LAST HAND</div>
        <div
          class="bp-hand-result"
          :class="game.resultPayout > 0 ? 'bp-hand-result--win' : 'bp-hand-result--loss'"
        >
          {{ game.resultHandName || 'No Win' }}
        </div>
        <div v-if="game.resultPayout > 0" class="bp-hand-payout">
          +${{ (game.resultPayout * game.denomination).toFixed(2) }}
        </div>
        <div
          v-if="!game.wasOptimal"
          class="bp-hand-mistake"
        >
          MISTAKE &mdash; ${{ game.lastMistakeCost.toFixed(2) }} lost
        </div>
        <div
          v-else-if="game.stats.handsPlayed > 0"
          class="bp-hand-optimal"
        >
          OPTIMAL
        </div>
      </div>
    </template>

    <!-- Enhanced stats -->
    <template v-if="game.stats.handsPlayed >= 5">
      <div class="bp-divider" />
      <div class="bp-section">
        <div class="bp-label">PACE</div>
        <UTooltip text="Your play speed. Professional VP players average 600-800 hands/hour. Faster = more throughput = more comp value.">
          <div class="bp-row">
            <span class="bp-row-label">Hands/hr</span>
            <span class="bp-row-value">{{ game.handsPerHour }}</span>
          </div>
        </UTooltip>
        <UTooltip text="Your effective hourly rate based on session results so far. Includes wins and losses but not comp value. Professional VP pros targeted $25-50/hr including comps.">
          <div class="bp-row">
            <span class="bp-row-label">$/hr</span>
            <span
              class="bp-row-value"
              :class="game.effectiveHourlyRate >= 0 ? 'bp-value--good' : 'bp-value--bad'"
            >
              {{ game.effectiveHourlyRate >= 0 ? '+' : '' }}${{ game.effectiveHourlyRate.toFixed(2) }}
            </span>
          </div>
        </UTooltip>
        <div class="bp-row">
          <span class="bp-row-label">Session</span>
          <span class="bp-row-value">{{ game.sessionElapsedMinutes }}m</span>
        </div>
      </div>
    </template>

    <!-- End session button -->
    <template v-if="game.stats.handsPlayed >= 3 && !game.sessionEnded">
      <div class="bp-divider" />
      <button class="bp-end-session" @click="game.endSession()">
        End Session
      </button>
    </template>

    <!-- Session ended — persona results teaser -->
    <template v-if="game.sessionEnded">
      <div class="bp-divider" />
      <div class="bp-section">
        <div class="bp-label" style="color: #4ade80">SESSION COMPLETE</div>
        <div style="font-size: 0.65rem; color: #8890b8; margin-bottom: 6px">
          Bot comparison ready. See how Perfect Pat, Almost Alice, and Gut-Feel Gary would have played your hands.
        </div>
        <a href="#bot-comparison" class="bp-link-btn" @click.prevent="scrollToComparison">
          View Bot Comparison &#x2192;
        </a>
      </div>
    </template>

    <!-- Game rules button -->
    <div class="bp-divider" />
    <button class="bp-rules-btn" @click="rulesOpen = true">
      {{ game.payTable.variant }} Rules
    </button>
    <RulesModal v-model:open="rulesOpen" :variant="game.payTable.variant" />
  </div>
</template>

<style scoped>
.bankroll-panel {
  width: 100%;
  background: linear-gradient(180deg, #1e1e3a 0%, #1a1a2e 100%);
  border: 1px solid #28284a;
  border-radius: 10px;
  box-shadow: 0 0 0 1px rgba(201, 162, 39, 0.3), 0 4px 16px rgba(0, 0, 0, 0.4);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-family: 'Fira Code', monospace;
}

.bp-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bp-label {
  font-size: 0.55rem;
  font-weight: 700;
  color: #5560a0;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 2px;
}

.bp-value {
  font-size: 0.82rem;
  font-weight: 700;
  color: #e0e0ff;
}

.bp-value--large {
  font-size: 1.1rem;
  color: #4ade80;
  text-shadow: 0 0 8px rgba(74, 222, 128, 0.3);
}

.bp-value--good {
  color: #4ade80;
}

.bp-value--neutral {
  color: #fbbf24;
}

.bp-value--bad {
  color: #f87171;
}

.bp-credits {
  font-size: 0.6rem;
  color: #5560a0;
}

.bp-divider {
  height: 1px;
  background: #28284a;
}

.bp-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.65rem;
}

.bp-row-label {
  color: #5560a0;
}

.bp-row-value {
  color: #aab0d8;
  font-weight: 600;
}

.bp-hand-result {
  font-size: 0.78rem;
  font-weight: 700;
}

.bp-hand-result--win {
  color: #ffd60a;
  text-shadow: 0 0 8px rgba(255, 214, 10, 0.3);
}

.bp-hand-result--loss {
  color: #5560a0;
}

.bp-hand-payout {
  font-size: 0.65rem;
  color: #4ade80;
  font-weight: 600;
}

.bp-hand-mistake {
  font-size: 0.58rem;
  color: #f87171;
  font-weight: 700;
  margin-top: 2px;
  padding: 2px 6px;
  background: rgba(248, 113, 113, 0.1);
  border-radius: 3px;
}

.bp-hand-optimal {
  font-size: 0.58rem;
  color: #4ade80;
  font-weight: 700;
  margin-top: 2px;
}

.bp-end-session {
  width: 100%;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid #4a4a6e;
  background: linear-gradient(180deg, #3a3a5e, #2a2a4e);
  color: #e0e0ff;
  font-size: 0.65rem;
  font-weight: 700;
  font-family: 'Fira Code', monospace;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: all 0.15s;
}

.bp-end-session:hover {
  background: linear-gradient(180deg, #4a4a6e, #3a3a5e);
  border-color: #c9a227;
  color: #ffd60a;
}

/* Sparkline */
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
  transform: translate(-50%, -50%);
  pointer-events: auto;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s;
  opacity: 0.7;
}

.bp-sparkline__dot:hover {
  transform: translate(-50%, -50%) scale(1.8);
  opacity: 1;
  z-index: 10;
}

.bp-sparkline__dot--win {
  background: #4ade80;
  box-shadow: 0 0 4px rgba(74, 222, 128, 0.4);
}

.bp-sparkline__dot--loss {
  background: #f87171;
  box-shadow: 0 0 4px rgba(248, 113, 113, 0.4);
}

.bp-sparkline__dot--start {
  background: #6b7280;
  width: 5px;
  height: 5px;
}

.bp-link-btn {
  display: block;
  width: 100%;
  text-align: center;
  padding: 6px;
  border-radius: 6px;
  border: 1px solid rgba(74, 222, 128, 0.3);
  background: rgba(74, 222, 128, 0.08);
  color: #4ade80;
  font-size: 0.65rem;
  font-weight: 700;
  font-family: 'Fira Code', monospace;
  text-decoration: none;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  transition: all 0.15s;
}

.bp-link-btn:hover {
  background: rgba(74, 222, 128, 0.15);
  border-color: rgba(74, 222, 128, 0.5);
}

.bp-rules-btn {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.3);
  background: rgba(99, 102, 241, 0.08);
  color: #a5b4fc;
  font-size: 0.7rem;
  font-weight: 700;
  font-family: 'Fira Code', monospace;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: all 0.15s;
}

.bp-rules-btn:hover {
  background: rgba(99, 102, 241, 0.15);
  border-color: rgba(99, 102, 241, 0.5);
  color: #c7d2fe;
}
</style>
