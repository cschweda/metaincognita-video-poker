<script setup lang="ts">
import { formatHeldCards } from '~/utils/evCalculator'
import { cardLabel, RANK_NAMES, SUIT_NAMES } from '~/utils/cards'
import type { Card } from '~/utils/cards'
import { PERSONAS } from '~/utils/botPersonas'

const game = useGameStore()

const showAllOptions = ref(false)
const showHistory = ref(false)

const playerRank = computed(() => {
  if (!game.playerAnalysis) return -1
  return game.allHoldOptions.findIndex(opt =>
    opt.heldIndices.length === game.playerAnalysis!.heldIndices.length
    && opt.heldIndices.every(idx => game.playerAnalysis!.heldIndices.includes(idx))
  ) + 1
})

// Sorted outcome distribution for the current hold selection
const sortedDistribution = computed(() => {
  const analysis = game.currentHoldAnalysis
  if (!analysis) return {}
  // Sort by probability descending, exclude very low probabilities
  const entries = Object.entries(analysis.handDistribution)
    .filter(([, prob]) => prob >= 0.0005)
    .sort((a, b) => b[1] - a[1])
  return Object.fromEntries(entries)
})

// Brief explanation of WHY the optimal play is best
const optimalReason = computed(() => {
  const opt = game.optimalPlay
  if (!opt) return ''

  const dist = opt.handDistribution
  // Get paying hands sorted by probability (exclude Nothing)
  const payingHands = Object.entries(dist)
    .filter(([name]) => name !== 'Nothing')
    .sort((a, b) => b[1] - a[1])

  const totalWinPct = payingHands.reduce((sum, [, p]) => sum + p, 0) * 100
  const nothingPct = (dist['Nothing'] || 0) * 100

  if (payingHands.length === 0) {
    return 'No realistic winning draws — minimize losses.'
  }

  // Check if it's a pat hand (hold all 5)
  if (opt.heldIndices.length === 5) {
    return 'Already a made hand — any draw risks losing it.'
  }

  // Find the top 2 paying outcomes
  const top = payingHands.slice(0, 3)
  const parts: string[] = []

  for (const [name, prob] of top) {
    const pct = (prob * 100).toFixed(1)
    parts.push(`${pct}% chance of ${name}`)
  }

  let reason = parts.join(', ')

  // Add overall win probability
  if (totalWinPct > 0) {
    reason += `. Total win probability: ${totalWinPct.toFixed(1)}%.`
  }

  // Compare to second-best option
  if (game.allHoldOptions.length >= 2) {
    const secondBest = game.allHoldOptions[1]!
    const evDiff = opt.expectedValue - secondBest.expectedValue
    if (evDiff > 0.001) {
      reason += ` Next best option is ${(evDiff * 100).toFixed(1)}% worse in EV.`
    } else {
      reason += ' Very close to the next-best option — a marginal edge.'
    }
  }

  return reason
})

// Human-readable optimal play description like "Hold the pair of 7s"
const optimalDescription = computed(() => {
  const opt = game.optimalPlay
  if (!opt) return ''

  const cards = opt.heldCards
  if (cards.length === 0) return 'Discard everything — draw 5 new cards'
  if (cards.length === 5) return 'Hold all 5 cards — pat hand'

  return describeHold(cards, opt.heldIndices)
})

function describeHold(cards: Card[], indices: number[]): string {
  // Detect deuces (wild cards in Deuces Wild)
  const deuces = cards.filter(c => c.rank === 2)
  const naturals = cards.filter(c => c.rank !== 2)
  const isDeucesWild = game.payTable.classifier === 'deucesWild'

  if (isDeucesWild && deuces.length > 0 && naturals.length === 0) {
    return `Hold ${deuces.length} deuce${deuces.length > 1 ? 's' : ''} (wild)`
  }

  // Detect patterns for more natural descriptions
  const ranks = naturals.length > 0 ? naturals.map(c => c.rank) : cards.map(c => c.rank)
  const suits = naturals.length > 0 ? naturals.map(c => c.suit) : cards.map(c => c.suit)
  const rankCounts: Record<number, number> = {}
  for (const r of ranks) rankCounts[r] = (rankCounts[r] || 0) + 1

  const pairs = Object.entries(rankCounts).filter(([, c]) => c >= 2)
  const allSameSuit = suits.length > 0 && suits.every(s => s === suits[0])

  const wildSuffix = isDeucesWild && deuces.length > 0
    ? ` + ${deuces.length} wild`
    : ''

  if (naturals.length === 2 && pairs.length === 1) {
    return `Hold the pair of ${RANK_NAMES[Number(pairs[0]![0])]}s${wildSuffix}`
  }
  if (naturals.length === 3 && pairs.length === 1 && Object.values(rankCounts).includes(3)) {
    return `Hold three ${RANK_NAMES[Number(pairs[0]![0])]}s${wildSuffix}`
  }
  if (naturals.length >= 3 && allSameSuit && naturals.length + deuces.length === 4) {
    return `Hold 4 to a flush (${SUIT_NAMES[suits[0]!]})${wildSuffix}`
  }
  if (naturals.length >= 3 && naturals.length + deuces.length === 4) {
    const sorted = [...ranks].sort((a, b) => a - b)
    const isOpenEnded = sorted.length >= 3 && sorted[sorted.length - 1]! - sorted[0]! <= 4
    if (isOpenEnded) return `Hold 4 to a straight${wildSuffix}`
  }
  if (naturals.length >= 2 && allSameSuit && naturals.length + deuces.length === 3) {
    return `Hold 3 to a flush (${SUIT_NAMES[suits[0]!]})${wildSuffix}`
  }

  // Fallback: list the cards
  const shortLabels = cards.map(c => cardLabel(c))
  return `Hold ${shortLabels.join(', ')}`
}
</script>

<template>
  <div class="training-panel">
    <!-- PHASE: idle — waiting for deal -->
    <template v-if="game.phase === 'idle'">
      <div class="tp-section">
        <div class="tp-phase-title">Ready to Play</div>
        <div class="tp-phase-desc">
          Click <strong>DEAL</strong> or <strong>BET MAX</strong> to begin.
          The optimal play will be shown after each deal.
        </div>
      </div>
    </template>

    <!-- PHASE: dealing — cards being dealt, EV computing -->
    <template v-if="game.phase === 'dealing'">
      <div class="tp-section">
        <div class="tp-phase-title">
          <span class="tp-spinner" />
          Analyzing hand...
        </div>
        <div class="tp-phase-desc">
          Computing optimal play across all 32 hold combinations
        </div>
      </div>
    </template>

    <!-- PHASE: dealt — show optimal play + live analysis -->
    <template v-if="game.phase === 'dealt'">
      <!-- Show spinner if EV not ready yet -->
      <div v-if="!game.optimalPlay" class="tp-section">
        <div class="tp-phase-title">
          <span class="tp-spinner" />
          Computing optimal play...
        </div>
        <div class="tp-phase-desc">Analyzing all 32 hold combinations</div>
      </div>

      <!-- EV results ready -->
      <template v-else>
        <div class="tp-section">
          <div class="tp-rec-label">OPTIMAL PLAY</div>
          <div class="tp-rec-description">
            {{ optimalDescription }}
          </div>
          <div class="tp-rec-ev">
            EV: {{ game.optimalPlay?.expectedValue.toFixed(4) ?? '—' }}
          </div>
          <div v-if="optimalReason" class="tp-rec-reason">
            {{ optimalReason }}
          </div>
        </div>

        <!-- Live outcome distribution for current hold selection -->
        <div class="tp-section">
          <div class="tp-rec-label">YOUR CURRENT SELECTION</div>
          <template v-if="game.currentHoldAnalysis">
            <div class="tp-current-hold">
              <div class="tp-current-hold__cards">
                {{ formatHeldCards(game.currentHoldAnalysis) }}
              </div>
              <div class="tp-current-hold__ev">
                EV: {{ game.currentHoldAnalysis.expectedValue.toFixed(4) }}
                <span
                  v-if="game.optimalPlay"
                  class="tp-current-hold__delta"
                  :class="{
                    'tp-current-hold__delta--optimal': Math.abs(game.currentHoldAnalysis.expectedValue - game.optimalPlay.expectedValue) < 0.0001,
                    'tp-current-hold__delta--sub': Math.abs(game.currentHoldAnalysis.expectedValue - game.optimalPlay.expectedValue) >= 0.0001,
                  }"
                >
                  <template v-if="Math.abs(game.currentHoldAnalysis.expectedValue - game.optimalPlay.expectedValue) < 0.0001">
                    &#10003; Optimal
                  </template>
                  <template v-else>
                    {{ (game.currentHoldAnalysis.expectedValue - game.optimalPlay.expectedValue).toFixed(4) }} vs optimal
                  </template>
                </span>
              </div>
            </div>

            <!-- Outcome probabilities -->
            <div class="tp-dist">
              <div class="tp-dist__title">Draw Outcomes</div>
              <div
                v-for="(prob, handName) in sortedDistribution"
                :key="handName"
                class="tp-dist__row"
              >
                <span class="tp-dist__hand">{{ handName }}</span>
                <div class="tp-dist__bar-bg">
                  <div
                    class="tp-dist__bar"
                    :class="{ 'tp-dist__bar--win': handName !== 'Nothing' }"
                    :style="{ width: (prob * 100) + '%' }"
                  />
                </div>
                <span class="tp-dist__pct">{{ (prob * 100).toFixed(1) }}%</span>
              </div>
            </div>
          </template>
          <div v-else class="tp-current-hold__empty">
            No cards held — will draw 5 new cards
          </div>
        </div>

        <!-- Top options during hold phase -->
        <div class="tp-section">
          <div class="tp-rec-label">TOP HOLD OPTIONS</div>
          <div class="tp-options-list">
            <div class="tp-options-header">
              <span class="tp-opt-rank">#</span>
              <span class="tp-opt-hold">Hold</span>
              <span class="tp-opt-ev">EV</span>
              <span class="tp-opt-delta">&#916;</span>
            </div>
            <div
              v-for="(opt, i) in game.allHoldOptions.slice(0, 5)"
              :key="i"
              class="tp-option-row"
              :class="{
                'tp-option-row--optimal': i === 0,
                'tp-option-row--current': game.currentHoldAnalysis
                  && opt.heldIndices.length === game.currentHoldAnalysis.heldIndices.length
                  && opt.heldIndices.every(idx => game.currentHoldAnalysis!.heldIndices.includes(idx)),
              }"
            >
              <span class="tp-opt-rank">{{ i + 1 }}</span>
              <span class="tp-opt-hold">{{ formatHeldCards(opt) }}</span>
              <span class="tp-opt-ev">{{ opt.expectedValue.toFixed(4) }}</span>
              <span class="tp-opt-delta">
                {{ i === 0 ? '—' : (-(game.allHoldOptions[0]!.expectedValue - opt.expectedValue)).toFixed(3) }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- PHASE: drawing — cards being replaced -->
    <template v-if="game.phase === 'drawing'">
      <div class="tp-section">
        <div class="tp-phase-title">Drawing...</div>
      </div>
    </template>

    <!-- PHASE: result — full analysis -->
    <template v-if="game.phase === 'result'">
      <!-- Hand result banner -->
      <div class="tp-section">
        <div
          class="tp-result-banner"
          :class="game.resultPayout > 0 ? 'tp-result-banner--win' : 'tp-result-banner--loss'"
        >
          <div class="tp-result-banner__icon">
            {{ game.resultPayout > 0 ? '&#10004;' : '&#10006;' }}
          </div>
          <div>
            <div class="tp-result-banner__hand">
              {{ game.resultHandName || 'No Win' }}
            </div>
            <div v-if="game.resultPayout > 0" class="tp-result-banner__payout">
              Won ${{ (game.resultPayout * game.denomination).toFixed(2) }}
              <span class="tp-result-banner__net">(net +${{ ((game.resultPayout - game.coinsBet) * game.denomination).toFixed(2) }})</span>
            </div>
            <div v-else class="tp-result-banner__payout tp-result-banner__payout--loss">
              Lost ${{ game.betAsDollars }}
            </div>
          </div>
        </div>
      </div>

      <!-- Hand recap — step by step -->
      <div v-if="game.handHistory.length > 0" class="tp-section">
        <div class="tp-rec-label">HAND RECAP</div>
        <div class="tp-recap">
          <!-- Step 1: Dealt -->
          <div class="tp-recap__step">
            <span class="tp-recap__num">1</span>
            <div>
              <div class="tp-recap__label">Dealt</div>
              <div class="tp-recap__cards">
                {{ game.handHistory[0]!.dealtCards.map(c => cardLabel(c)).join('  ') }}
              </div>
            </div>
          </div>

          <!-- Step 2: Your holds -->
          <div class="tp-recap__step">
            <span class="tp-recap__num">2</span>
            <div>
              <div class="tp-recap__label">You held</div>
              <div class="tp-recap__cards">
                {{ game.handHistory[0]!.playerHeld.length > 0
                  ? game.handHistory[0]!.playerHeld.map(i => cardLabel(game.handHistory[0]!.dealtCards[i]!)).join('  ')
                  : 'Nothing (drew 5 new cards)' }}
              </div>
              <div class="tp-recap__ev">EV: {{ game.handHistory[0]!.playerEV.toFixed(4) }}</div>
            </div>
          </div>

          <!-- Step 2b: Optimal (if different) -->
          <div v-if="!game.wasOptimal" class="tp-recap__step tp-recap__step--optimal">
            <span class="tp-recap__num tp-recap__num--optimal">&#10148;</span>
            <div>
              <div class="tp-recap__label tp-recap__label--optimal">Optimal was</div>
              <div class="tp-recap__cards tp-recap__cards--optimal">
                {{ game.handHistory[0]!.optimalHeld.length > 0
                  ? game.handHistory[0]!.optimalHeld.map(i => cardLabel(game.handHistory[0]!.dealtCards[i]!)).join('  ')
                  : 'Nothing (draw 5 new cards)' }}
              </div>
              <div class="tp-recap__ev tp-recap__ev--optimal">EV: {{ game.handHistory[0]!.optimalEV.toFixed(4) }}</div>
              <div v-if="optimalReason" class="tp-recap__reason">{{ optimalReason }}</div>
            </div>
          </div>

          <!-- Step 3: Result -->
          <div class="tp-recap__step">
            <span class="tp-recap__num">3</span>
            <div>
              <div class="tp-recap__label">Final hand</div>
              <div class="tp-recap__cards">
                {{ game.handHistory[0]!.finalCards.map(c => cardLabel(c)).join('  ') }}
              </div>
              <div
                class="tp-recap__result"
                :class="game.handHistory[0]!.payout > 0 ? 'tp-recap__result--win' : 'tp-recap__result--loss'"
              >
                {{ game.handHistory[0]!.handResult || 'No Win' }}
                <span v-if="game.handHistory[0]!.payout > 0"> &mdash; +${{ (game.handHistory[0]!.payout * game.denomination).toFixed(2) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Mistake cost -->
        <div v-if="!game.wasOptimal" class="tp-mistake-cost">
          Cost of mistake: <strong>${{ game.lastMistakeCost.toFixed(2) }}</strong>
          <span class="tp-rank">(your play ranked #{{ playerRank }} of 32)</span>
        </div>

        <!-- Verdict badge -->
        <div class="tp-header" style="margin-top: 8px">
          <span
            class="tp-verdict"
            :class="game.wasOptimal ? 'tp-verdict--correct' : 'tp-verdict--mistake'"
          >
            {{ game.wasOptimal ? 'OPTIMAL PLAY' : 'MISTAKE' }}
          </span>
        </div>
      </div>

      <!-- All 32 options -->
      <div class="tp-section">
        <button class="tp-toggle" @click="showAllOptions = !showAllOptions">
          {{ showAllOptions ? 'Hide' : 'Show all' }} 32 options
          <span class="tp-toggle-arrow">{{ showAllOptions ? '&#9650;' : '&#9660;' }}</span>
        </button>

        <div v-if="showAllOptions" class="tp-options-list">
          <div class="tp-options-header">
            <span class="tp-opt-rank">#</span>
            <span class="tp-opt-hold">Hold</span>
            <span class="tp-opt-ev">EV</span>
            <span class="tp-opt-delta">&#916; Best</span>
          </div>
          <div
            v-for="(opt, i) in game.allHoldOptions"
            :key="i"
            class="tp-option-row"
            :class="{
              'tp-option-row--optimal': i === 0,
              'tp-option-row--player': game.playerAnalysis
                && opt.heldIndices.length === game.playerAnalysis.heldIndices.length
                && opt.heldIndices.every(idx => game.playerAnalysis!.heldIndices.includes(idx)),
            }"
          >
            <span class="tp-opt-rank">{{ i + 1 }}</span>
            <span class="tp-opt-hold">{{ formatHeldCards(opt) }}</span>
            <span class="tp-opt-ev">{{ opt.expectedValue.toFixed(4) }}</span>
            <span class="tp-opt-delta">
              {{ i === 0 ? '—' : (-(game.allHoldOptions[0]!.expectedValue - opt.expectedValue)).toFixed(4) }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <!-- Session stats — always visible when hands have been played -->
    <div v-if="game.stats.handsPlayed > 0" class="tp-section tp-session">
      <div class="tp-rec-label">SESSION</div>
      <div class="tp-session-grid">
        <div class="tp-stat">
          <span class="tp-stat-value">{{ game.stats.handsPlayed }}</span>
          <span class="tp-stat-label">Hands</span>
        </div>
        <div class="tp-stat">
          <span
            class="tp-stat-value"
            :class="game.stats.totalMistakes > 0 ? 'tp-stat-value--bad' : 'tp-stat-value--good'"
          >
            {{ game.stats.totalMistakes }}
          </span>
          <span class="tp-stat-label">Mistakes</span>
        </div>
        <div class="tp-stat">
          <span
            class="tp-stat-value"
            :class="game.stats.totalEVLost > 0 ? 'tp-stat-value--bad' : 'tp-stat-value--good'"
          >
            ${{ game.stats.totalEVLost.toFixed(2) }}
          </span>
          <span class="tp-stat-label">EV Lost</span>
        </div>
        <div class="tp-stat">
          <span class="tp-stat-value">
            {{ game.effectiveReturn.toFixed(1) }}%
          </span>
          <span class="tp-stat-label">Return</span>
        </div>
      </div>
    </div>

    <!-- Hand history — always available when hands have been played -->
    <div v-if="game.handHistory.length > 0" class="tp-section">
      <button class="tp-toggle" @click="showHistory = !showHistory">
        Hand History ({{ game.handHistory.length }})
        <span class="tp-toggle-arrow">{{ showHistory ? '&#9650;' : '&#9660;' }}</span>
      </button>

      <div v-if="showHistory" class="tp-history">
        <div
          v-for="entry in game.handHistory"
          :key="entry.handNumber"
          class="tp-history-entry"
          :class="{ 'tp-history-entry--mistake': entry.mistakeCost > 0.001 }"
        >
          <div class="tp-history-header">
            <span class="tp-history-num">#{{ entry.handNumber }}</span>
            <span v-if="entry.handResult" class="tp-history-result">{{ entry.handResult }}</span>
            <span v-else class="tp-history-result tp-history-result--loss">No Win</span>
            <span v-if="entry.payout > 0" class="tp-history-payout">+{{ entry.payout }}</span>
          </div>
          <div class="tp-history-cards">
            Dealt: {{ entry.dealtCards.map(c => cardLabel(c)).join(' ') }}
          </div>
          <div v-if="entry.mistakeCost > 0.001" class="tp-history-mistake">
            Held: {{ entry.playerHeld.map(i => cardLabel(entry.dealtCards[i]!)).join(' ') || 'nothing' }}
            &rarr; Optimal: {{ entry.optimalHeld.map(i => cardLabel(entry.dealtCards[i]!)).join(' ') || 'nothing' }}
            &middot; Cost: ${{ entry.mistakeCost.toFixed(2) }}
          </div>
        </div>
      </div>
    </div>

    <!-- PERSONA COMPARISON — shown after End Session -->
    <div v-if="game.sessionEnded && game.personaResults.length > 0" class="tp-section">
      <div class="tp-rec-label">BOT COMPARISON</div>
      <p class="tp-persona-intro">
        Your {{ game.stats.handsPlayed }} dealt hands replayed through 4 player personas.
        Same cards, different strategies — same luck, different skill.
      </p>

      <!-- Player's own result -->
      <div class="tp-persona-row tp-persona-row--you">
        <div class="tp-persona-name">
          You
          <span class="tp-persona-style">Your actual plays</span>
        </div>
        <div class="tp-persona-stats">
          <span class="tp-persona-return" :class="game.effectiveReturn >= 99 ? 'tp-persona-return--good' : game.effectiveReturn >= 96 ? 'tp-persona-return--ok' : 'tp-persona-return--bad'">
            {{ game.effectiveReturn.toFixed(2) }}%
          </span>
          <span class="tp-persona-net" :class="(game.stats.totalReturned - game.stats.totalWagered) >= 0 ? 'tp-persona-net--up' : 'tp-persona-net--down'">
            {{ (game.stats.totalReturned - game.stats.totalWagered) >= 0 ? '+' : '' }}${{ ((game.stats.totalReturned - game.stats.totalWagered) * game.denomination).toFixed(2) }}
          </span>
        </div>
      </div>

      <!-- Each persona -->
      <div
        v-for="pr in game.personaResults"
        :key="pr.personaId"
        class="tp-persona-row"
      >
        <div class="tp-persona-name">
          {{ pr.personaName }}
          <span class="tp-persona-style">{{ PERSONAS.find(p => p.id === pr.personaId)?.style }}</span>
        </div>
        <div class="tp-persona-stats">
          <span
            class="tp-persona-return"
            :class="pr.returnPct >= 99 ? 'tp-persona-return--good' : pr.returnPct >= 96 ? 'tp-persona-return--ok' : 'tp-persona-return--bad'"
          >
            {{ pr.returnPct.toFixed(2) }}%
          </span>
          <span
            class="tp-persona-net"
            :class="(pr.totalPayout - pr.totalWagered) >= 0 ? 'tp-persona-net--up' : 'tp-persona-net--down'"
          >
            {{ (pr.totalPayout - pr.totalWagered) >= 0 ? '+' : '' }}${{ ((pr.totalPayout - pr.totalWagered) * game.denomination).toFixed(2) }}
          </span>
        </div>
      </div>

      <p class="tp-persona-note">
        The gap between you and Perfect Pat is the dollar value of your mistakes.
        The gap between Pat and Gary is the dollar value of learning strategy.
      </p>

      <!-- New session button -->
      <button class="tp-new-session" @click="game.resetSession()">
        New Session
      </button>
    </div>
  </div>
</template>

<style scoped>
.training-panel {
  max-width: 740px;
  width: 100%;
  background: rgba(17, 24, 39, 0.6);
  border-radius: 10px;
  padding: 16px 20px;
  color: #e2e8f0;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 0.82rem;
  line-height: 1.5;
  border: 1px solid rgba(55, 65, 81, 0.6);
  border-left: 4px solid #c9a227;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tp-section {
  border-bottom: 1px solid rgba(55, 65, 81, 0.5);
  padding-bottom: 12px;
}

/* Hand result banner */
.tp-result-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
}

.tp-result-banner--win {
  background: rgba(22, 101, 52, 0.2);
  border: 2px solid rgba(74, 222, 128, 0.3);
}

.tp-result-banner--loss {
  background: rgba(127, 29, 29, 0.2);
  border: 2px solid rgba(248, 113, 113, 0.3);
}

.tp-result-banner__icon {
  font-size: 1.5rem;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tp-result-banner--win .tp-result-banner__icon {
  background: #4ade80;
  color: #052e16;
}

.tp-result-banner--loss .tp-result-banner__icon {
  background: #fca5a5;
  color: #7f1d1d;
}

.tp-result-banner__hand {
  font-family: 'Fira Code', monospace;
  font-size: 1rem;
  font-weight: 700;
}

.tp-result-banner--win .tp-result-banner__hand {
  color: #4ade80;
}

.tp-result-banner--loss .tp-result-banner__hand {
  color: #f87171;
}

.tp-result-banner__payout {
  font-family: 'Fira Code', monospace;
  font-size: 0.78rem;
  font-weight: 600;
  margin-top: 2px;
  color: #4ade80;
  margin-top: 2px;
}

.tp-result-banner__payout--loss {
  color: #f87171;
}

.tp-result-banner__net {
  font-size: 0.68rem;
  font-weight: 400;
  color: #4ade80;
  margin-left: 4px;
}

/* Hand recap steps */
.tp-recap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.tp-recap__step {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.tp-recap__step--optimal {
  background: rgba(127, 29, 29, 0.2);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: 6px;
  padding: 6px 8px;
  margin-left: 24px;
}

.tp-recap__num {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(55, 65, 81, 0.4);
  color: #9ca3af;
  font-size: 0.65rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

.tp-recap__num--optimal {
  background: rgba(248, 113, 113, 0.3);
  color: #f87171;
  width: auto;
  height: auto;
  border-radius: 0;
  font-size: 0.75rem;
}

.tp-recap__label {
  font-size: 0.65rem;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.tp-recap__label--optimal {
  color: #f87171;
}

.tp-recap__cards {
  font-family: 'Fira Code', monospace;
  font-size: 0.78rem;
  font-weight: 600;
  color: #e2e8f0;
  margin-top: 1px;
  letter-spacing: 0.02em;
}

.tp-recap__cards--optimal {
  color: #4ade80;
}

.tp-recap__ev {
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
  color: #6b7280;
  margin-top: 1px;
}

.tp-recap__ev--optimal {
  color: #4ade80;
}

.tp-recap__result {
  font-size: 0.78rem;
  font-weight: 700;
  margin-top: 2px;
}

.tp-recap__result--win {
  color: #4ade80;
}

.tp-recap__result--loss {
  color: #6b7280;
}

.tp-recap__reason {
  font-size: 0.68rem;
  color: #4ade80;
  font-style: italic;
  margin-top: 3px;
  line-height: 1.4;
}

.tp-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

/* Phase titles (idle, dealing, drawing) */
.tp-phase-title {
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
  font-weight: 700;
  color: #818cf8;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tp-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(55, 65, 81, 0.5);
  border-top-color: #818cf8;
  border-radius: 50%;
  animation: tp-spin 0.6s linear infinite;
  flex-shrink: 0;
}

@keyframes tp-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .tp-spinner { animation-duration: 0.01ms !important; }
}

.tp-phase-desc {
  font-size: 0.78rem;
  color: #9ca3af;
  margin-top: 4px;
}

/* Optimal play recommendation (dealt phase) */
.tp-rec-label {
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: #818cf8;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.tp-rec-description {
  font-size: 0.9rem;
  font-weight: 700;
  color: #4ade80;
  padding: 8px 12px;
  background: rgba(22, 101, 52, 0.2);
  border-radius: 6px;
  border: 1px solid rgba(74, 222, 128, 0.3);
}

.tp-rec-ev {
  font-family: 'Fira Code', monospace;
  font-size: 0.72rem;
  color: #6b7280;
  margin-top: 4px;
}

.tp-rec-reason {
  font-size: 0.72rem;
  color: #9ca3af;
  margin-top: 6px;
  line-height: 1.4;
  font-style: italic;
}

/* Verdict (result phase) */
.tp-header {
  margin-bottom: 8px;
}

.tp-verdict {
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 3px 12px;
  border-radius: 4px;
  font-family: 'Fira Code', monospace;
}

.tp-verdict--correct {
  background: rgba(22, 101, 52, 0.2);
  color: #4ade80;
}

.tp-verdict--mistake {
  background: rgba(127, 29, 29, 0.2);
  color: #f87171;
}

.tp-comparison {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tp-play-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.tp-play-label {
  font-size: 0.75rem;
  color: #9ca3af;
  min-width: 72px;
}

.tp-play-cards {
  font-family: 'Fira Code', monospace;
  font-weight: 600;
  font-size: 0.82rem;
}

.tp-play-cards--optimal {
  color: #4ade80;
}

.tp-play-ev {
  font-family: 'Fira Code', monospace;
  font-size: 0.72rem;
  color: #6b7280;
}

.tp-play-ev--optimal {
  color: #4ade80;
}

.tp-mistake-cost {
  margin-top: 6px;
  font-size: 0.8rem;
  color: #f87171;
  background: rgba(127, 29, 29, 0.2);
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid rgba(248, 113, 113, 0.3);
}

.tp-mistake-cost strong {
  font-family: 'Fira Code', monospace;
}

.tp-rank {
  color: #6b7280;
  font-size: 0.72rem;
}

/* Session stats */
.tp-session-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  text-align: center;
}

.tp-stat-value {
  display: block;
  font-family: 'Fira Code', monospace;
  font-size: 1rem;
  font-weight: 700;
  color: #e2e8f0;
}

.tp-stat-value--bad {
  color: #f87171;
}

.tp-stat-value--good {
  color: #4ade80;
}

.tp-stat-label {
  display: block;
  font-size: 0.65rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Toggle button */
.tp-toggle {
  all: unset;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px 0;
}

.tp-toggle:hover {
  color: #f1f5f9;
}

.tp-toggle-arrow {
  font-size: 0.6rem;
}

/* 32 options list */
.tp-options-list {
  margin-top: 8px;
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
}

.tp-options-header {
  display: grid;
  grid-template-columns: 28px 1fr 64px 52px;
  gap: 4px;
  padding: 4px 6px;
  color: #6b7280;
  font-weight: 400;
  border-bottom: 1px solid rgba(55, 65, 81, 0.5);
}

.tp-option-row {
  display: grid;
  grid-template-columns: 28px 1fr 64px 52px;
  gap: 4px;
  padding: 3px 6px;
  border-radius: 3px;
}

.tp-option-row--optimal {
  background: rgba(22, 101, 52, 0.2);
  font-weight: 700;
}

.tp-option-row--player {
  background: rgba(146, 112, 12, 0.2);
  outline: 1px solid rgba(201, 162, 39, 0.3);
}

.tp-option-row--player.tp-option-row--optimal {
  background: rgba(22, 101, 52, 0.2);
  outline: 1px solid rgba(74, 222, 128, 0.3);
}

.tp-opt-rank {
  color: #6b7280;
  text-align: right;
  padding-right: 4px;
}

.tp-opt-ev,
.tp-opt-delta {
  text-align: right;
}

/* Current hold selection (dealt phase) */
.tp-current-hold {
  margin-bottom: 10px;
}

.tp-current-hold__cards {
  font-family: 'Fira Code', monospace;
  font-weight: 700;
  font-size: 0.85rem;
  color: #e2e8f0;
}

.tp-current-hold__ev {
  font-family: 'Fira Code', monospace;
  font-size: 0.72rem;
  color: #6b7280;
  margin-top: 2px;
}

.tp-current-hold__delta {
  margin-left: 6px;
  font-weight: 700;
}

.tp-current-hold__delta--optimal {
  color: #4ade80;
}

.tp-current-hold__delta--sub {
  color: #f87171;
}

.tp-current-hold__empty {
  font-size: 0.78rem;
  color: #6b7280;
  font-style: italic;
}

/* Outcome distribution bars */
.tp-dist {
  margin-top: 4px;
}

.tp-dist__title {
  font-size: 0.6rem;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 4px;
}

.tp-dist__row {
  display: grid;
  grid-template-columns: 110px 1fr 42px;
  gap: 6px;
  align-items: center;
  padding: 1px 0;
  font-size: 0.68rem;
}

.tp-dist__hand {
  font-family: 'Fira Code', monospace;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tp-dist__bar-bg {
  height: 10px;
  background: rgba(55, 65, 81, 0.4);
  border-radius: 3px;
  overflow: hidden;
}

.tp-dist__bar {
  height: 100%;
  background: rgba(129, 140, 248, 0.4);
  border-radius: 3px;
  min-width: 1px;
  transition: width 0.2s ease;
}

.tp-dist__bar--win {
  background: #4ade80;
}

.tp-dist__pct {
  font-family: 'Fira Code', monospace;
  color: #9ca3af;
  text-align: right;
  font-size: 0.62rem;
}

/* Current hold row highlight in options list */
.tp-option-row--current {
  background: rgba(30, 64, 175, 0.2);
  outline: 1px solid rgba(96, 165, 250, 0.3);
}

.tp-option-row--current.tp-option-row--optimal {
  background: rgba(22, 101, 52, 0.2);
  outline: 1px solid rgba(74, 222, 128, 0.3);
}

/* Hand history */
.tp-history {
  margin-top: 8px;
  max-height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tp-history-entry {
  padding: 6px 8px;
  background: rgba(31, 41, 55, 0.4);
  border-radius: 4px;
  border: 1px solid rgba(55, 65, 81, 0.4);
}

.tp-history-entry--mistake {
  border-color: rgba(248, 113, 113, 0.3);
  background: rgba(127, 29, 29, 0.15);
}

.tp-history-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 0.78rem;
}

.tp-history-num {
  font-family: 'Fira Code', monospace;
  color: #6b7280;
  font-size: 0.7rem;
}

.tp-history-result {
  font-weight: 700;
  color: #e2e8f0;
}

.tp-history-result--loss {
  color: #6b7280;
  font-weight: 400;
}

.tp-history-payout {
  font-family: 'Fira Code', monospace;
  color: #4ade80;
  font-weight: 700;
  font-size: 0.72rem;
}

.tp-history-cards {
  font-family: 'Fira Code', monospace;
  font-size: 0.68rem;
  color: #9ca3af;
  margin-top: 2px;
}

.tp-history-mistake {
  font-size: 0.72rem;
  color: #f87171;
  margin-top: 4px;
  padding: 3px 6px;
  background: rgba(127, 29, 29, 0.2);
  border-radius: 3px;
}

/* Persona comparison */
.tp-persona-intro {
  font-size: 0.75rem;
  color: #9ca3af;
  margin-bottom: 10px;
  line-height: 1.4;
}

.tp-persona-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  border-radius: 4px;
  margin-bottom: 3px;
  background: rgba(31, 41, 55, 0.4);
  border: 1px solid rgba(55, 65, 81, 0.4);
}

.tp-persona-row--you {
  background: rgba(30, 58, 138, 0.2);
  border-color: rgba(96, 165, 250, 0.3);
}

.tp-persona-name {
  font-size: 0.78rem;
  font-weight: 700;
  color: #e2e8f0;
}

.tp-persona-style {
  display: block;
  font-size: 0.6rem;
  font-weight: 400;
  color: #6b7280;
}

.tp-persona-stats {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-family: 'Fira Code', monospace;
}

.tp-persona-return {
  font-size: 0.82rem;
  font-weight: 700;
}

.tp-persona-return--good { color: #4ade80; }
.tp-persona-return--ok { color: #fbbf24; }
.tp-persona-return--bad { color: #f87171; }

.tp-persona-net {
  font-size: 0.7rem;
  font-weight: 600;
}

.tp-persona-net--up { color: #4ade80; }
.tp-persona-net--down { color: #f87171; }

.tp-persona-note {
  font-size: 0.68rem;
  color: #6b7280;
  margin-top: 10px;
  line-height: 1.4;
  font-style: italic;
}

.tp-new-session {
  all: unset;
  display: block;
  width: 100%;
  text-align: center;
  margin-top: 10px;
  padding: 8px;
  border-radius: 6px;
  background: rgba(22, 101, 52, 0.2);
  color: #4ade80;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
}

.tp-new-session:hover {
  background: rgba(74, 222, 128, 0.3);
}
</style>
