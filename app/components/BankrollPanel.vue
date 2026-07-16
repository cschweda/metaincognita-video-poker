<script setup lang="ts">
import { VARIANT_RULES } from '~/utils/variantRules'

const game = useGameStore()
const rulesOpen = ref(false)

// Session time / $-per-hour read the store's reactive clock; tick it while
// this panel is visible so they don't freeze between hands
let clockTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  game.tickClock()
  clockTimer = setInterval(() => game.tickClock(), 30_000)
})
onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
})

const minPayingHand = computed(() =>
  VARIANT_RULES[game.payTable.variant]?.minPayingHand ?? 'Jacks or Better'
)

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
</script>

<template>
  <div class="bankroll-panel">
    <!-- Bankroll -->
    <div class="bp-section">
      <div class="bp-label">
        BALANCE
      </div>
      <div class="bp-value bp-value--large">
        ${{ game.creditsAsDollars }}
      </div>
    </div>

    <!-- Current bet -->
    <div class="bp-section">
      <div class="bp-label">
        BET
      </div>
      <div class="bp-value">
        ${{ game.betAsDollars }} / hand
      </div>
    </div>

    <div class="bp-divider" />

    <!-- Session summary -->
    <div class="bp-section">
      <div class="bp-label">
        SESSION
      </div>
      <StatRow
        label="Hands"
        :value="String(game.stats.handsPlayed)"
        tooltip="Total hands dealt this session."
      />
      <StatRow
        label="Won"
        :value="String(game.stats.handsWon)"
        :tooltip="`Hands where you received a payout (${minPayingHand} or higher).`"
      />
      <StatRow
        label="Wagered"
        :value="`$${(game.stats.totalWagered * game.denomination).toFixed(2)}`"
        tooltip="Total amount bet across all hands this session."
      />
      <StatRow
        label="Returned"
        :value="`$${(game.stats.totalReturned * game.denomination).toFixed(2)}`"
        tooltip="Total payouts received. Includes your original bet on winning hands (video poker pays 'for 1', not 'to 1')."
      />
      <StatRow
        label="Net"
        :value="`${netResult >= 0 ? '+' : ''}$${netResult.toFixed(2)}`"
        tooltip="Returned minus Wagered. Positive = you're up. Negative = you're down."
        :value-class="netResult > 0 ? 'bp-value--good' : netResult < 0 ? 'bp-value--bad' : ''"
      />
      <StatRow
        v-if="game.stats.handsPlayed > 0"
        label="Return"
        :value="`${game.effectiveReturn.toFixed(1)}%`"
        :tooltip="`Your actual return: ${game.effectiveReturn.toFixed(2)}%. Theoretical optimal for this pay table: ${game.payTable.returnPct}%. The gap is variance + any mistakes.`"
        :value-class="returnColor"
      />
    </div>

    <!-- Sparkline with interactive dots -->
    <BankrollSparkline />

    <div class="bp-divider" />

    <!-- Mistakes -->
    <div class="bp-section">
      <div class="bp-label">
        MISTAKES
      </div>
      <StatRow
        label="Count"
        :value="String(game.stats.totalMistakes)"
        tooltip="Hands where you held different cards than the mathematically optimal play. Zero mistakes = perfect play."
        :value-class="game.stats.totalMistakes > 0 ? 'bp-value--bad' : 'bp-value--good'"
      />
      <StatRow
        label="EV Lost"
        :value="`$${game.stats.totalEVLost.toFixed(2)}`"
        tooltip="The cumulative dollar cost of your mistakes. This is the money you left on the table by not playing optimally — the gap between your return and Perfect Pat's."
        :value-class="game.stats.totalEVLost > 0 ? 'bp-value--bad' : 'bp-value--good'"
      />
    </div>

    <!-- Last hand result (after draw) -->
    <template v-if="game.phase === 'result'">
      <div class="bp-divider" />
      <div class="bp-section">
        <div class="bp-label">
          LAST HAND
        </div>
        <div
          class="bp-hand-result"
          :class="game.resultPayout > 0 ? 'bp-hand-result--win' : 'bp-hand-result--loss'"
        >
          {{ game.resultHandName || 'No Win' }}
        </div>
        <div
          v-if="game.resultPayout > 0"
          class="bp-hand-payout"
        >
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
        <div class="bp-label">
          PACE
        </div>
        <StatRow
          label="Hands/hr"
          :value="String(game.handsPerHour)"
          tooltip="Your play speed. Professional VP players average 600-800 hands/hour. Faster = more throughput = more comp value."
        />
        <StatRow
          label="$/hr"
          :value="`${game.effectiveHourlyRate >= 0 ? '+' : ''}$${game.effectiveHourlyRate.toFixed(2)}`"
          tooltip="Your effective hourly rate based on session results so far. Includes wins and losses but not comp value. Professional VP pros targeted $25-50/hr including comps."
          :value-class="game.effectiveHourlyRate >= 0 ? 'bp-value--good' : 'bp-value--bad'"
        />
        <StatRow
          label="Session"
          :value="`${game.sessionElapsedMinutes}m`"
          tooltip="Minutes since this session started."
        />
      </div>
    </template>

    <!-- End session button -->
    <template v-if="game.stats.handsPlayed >= 3 && !game.sessionEnded">
      <div class="bp-divider" />
      <button
        class="bp-end-session"
        @click="game.endSession()"
      >
        End Session
      </button>
    </template>

    <!-- Session ended — persona results teaser -->
    <template v-if="game.sessionEnded">
      <div class="bp-divider" />
      <div class="bp-section">
        <div class="bp-label bp-label--complete">
          SESSION COMPLETE
        </div>
        <div class="bp-complete-note">
          Bot comparison ready. See how Perfect Pat, Almost Alice, and Gut-Feel Gary would have played your hands.
        </div>
        <a
          href="#bot-comparison"
          class="bp-link-btn"
          @click.prevent="scrollToComparison"
        >
          View Bot Comparison &#x2192;
        </a>
      </div>
    </template>

    <!-- Game rules button -->
    <div class="bp-divider" />
    <button
      class="bp-rules-btn"
      @click="rulesOpen = true"
    >
      {{ game.payTable.variant }} Rules
    </button>
    <RulesModal
      v-model:open="rulesOpen"
      :variant="game.payTable.variant"
    />
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
  color: var(--vp-muted);
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
  color: var(--vp-win);
  text-shadow: 0 0 8px rgba(74, 222, 128, 0.3);
}

.bp-value--good {
  color: var(--vp-win);
}

.bp-value--neutral {
  color: #fbbf24;
}

.bp-value--bad {
  color: var(--vp-loss);
}

.bp-label--complete {
  color: var(--vp-win);
}

.bp-complete-note {
  font-size: 0.65rem;
  color: #8890b8;
  margin-bottom: 6px;
}

.bp-divider {
  height: 1px;
  background: #28284a;
}

.bp-hand-result {
  font-size: 0.78rem;
  font-weight: 700;
}

.bp-hand-result--win {
  color: var(--vp-gold-bright);
  text-shadow: 0 0 8px rgba(255, 214, 10, 0.3);
}

.bp-hand-result--loss {
  color: var(--vp-muted);
}

.bp-hand-payout {
  font-size: 0.65rem;
  color: var(--vp-win);
  font-weight: 600;
}

.bp-hand-mistake {
  font-size: 0.58rem;
  color: var(--vp-loss);
  font-weight: 700;
  margin-top: 2px;
  padding: 2px 6px;
  background: rgba(248, 113, 113, 0.1);
  border-radius: 3px;
}

.bp-hand-optimal {
  font-size: 0.58rem;
  color: var(--vp-win);
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
  border-color: var(--vp-gold);
  color: var(--vp-gold-bright);
}

.bp-link-btn {
  display: block;
  width: 100%;
  text-align: center;
  padding: 6px;
  border-radius: 6px;
  border: 1px solid rgba(74, 222, 128, 0.3);
  background: rgba(74, 222, 128, 0.08);
  color: var(--vp-win);
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
