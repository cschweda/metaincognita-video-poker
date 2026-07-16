<script setup lang="ts">
import type { Card } from '~/utils/cards'
import { cardLabel } from '~/utils/cards'

defineOptions({ name: 'History' })
useHead({ title: 'Session History — Video Poker Trainer' })

const game = useGameStore()

const activeTab = ref<'overview' | 'hands'>('overview')
const expandedHand = ref<number | null>(null)

// Profit timeline for sparkline
const profitTimeline = computed(() => {
  const history = [...game.handHistory].reverse()
  let running = 0
  return history.map((h) => {
    running += (h.payout - game.coinsBet) * game.denomination
    return running
  })
})

// Hoisted: computing this inside each bar's :style made rendering O(n²)
const profitTimelineMaxAbs = computed(() =>
  Math.max(...profitTimeline.value.map(Math.abs), 1)
)

const biggestWin = computed(() => {
  if (game.handHistory.length === 0) return 0
  return Math.max(...game.handHistory.map(h => h.payout)) * game.denomination
})

const biggestLoss = computed(() => game.coinsBet * game.denomination)

const mistakeHands = computed(() =>
  game.handHistory.filter(h => h.mistakeCost > 0.001)
)

const reversedHistory = computed(() => [...game.handHistory].reverse())

function formatCards(cards: Card[]): string {
  return cards.map(c => cardLabel(c)).join(' ')
}

function exportHandHistory() {
  const lines: string[] = [
    `Video Poker Session History`,
    `Variant: ${game.payTable.variant} (${game.payTable.shortName})`,
    `Denomination: $${game.denomination.toFixed(2)}`,
    `Bet: ${game.coinsBet} coins ($${game.betAsDollars}/hand)`,
    `Hands: ${game.stats.handsPlayed} | Won: ${game.stats.handsWon} | Mistakes: ${game.stats.totalMistakes}`,
    `Return: ${game.effectiveReturn.toFixed(2)}% | EV Lost: $${game.stats.totalEVLost.toFixed(2)}`,
    ``,
    `--- HAND HISTORY ---`,
    ``
  ]

  const history = [...game.handHistory].reverse()
  for (const h of history) {
    lines.push(`Hand #${h.handNumber}`)
    lines.push(`  Dealt:   ${formatCards(h.dealtCards)}`)
    lines.push(`  Held:    ${h.playerHeld.length > 0 ? h.playerHeld.map(i => cardLabel(h.dealtCards[i]!)).join(' ') : '(nothing)'}`)
    lines.push(`  Optimal: ${h.optimalHeld.length > 0 ? h.optimalHeld.map(i => cardLabel(h.dealtCards[i]!)).join(' ') : '(nothing)'}`)
    lines.push(`  Final:   ${formatCards(h.finalCards)}`)
    lines.push(`  Result:  ${h.handResult || 'No Win'} | Payout: $${(h.payout * game.denomination).toFixed(2)}`)
    if (h.mistakeCost > 0.001) {
      lines.push(`  ** MISTAKE: cost $${h.mistakeCost.toFixed(2)} | Your EV: ${h.playerEV.toFixed(4)} | Optimal EV: ${h.optimalEV.toFixed(4)}`)
    }
    lines.push(``)
  }

  if (game.personaResults.length > 0) {
    lines.push(`--- BOT COMPARISON ---`)
    lines.push(``)
    lines.push(`You:             ${game.effectiveReturn.toFixed(2)}%  Net: $${((game.stats.totalReturned - game.stats.totalWagered) * game.denomination).toFixed(2)}`)
    for (const pr of game.personaResults) {
      lines.push(`${pr.personaName.padEnd(17)}${pr.returnPct.toFixed(2)}%  Net: $${((pr.totalPayout - pr.totalWagered) * game.denomination).toFixed(2)}`)
    }
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vp-session-${game.payTable.variant.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.txt`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="min-h-full bg-gray-950 text-white">
    <div class="max-w-5xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold">
            Session History
          </h1>
          <p class="text-sm text-gray-400 mt-0.5">
            {{ game.payTable.variant }} ({{ game.payTable.shortName }})
            <span v-if="game.stats.handsPlayed > 0"> &middot; {{ game.stats.handsPlayed }} hands</span>
          </p>
        </div>
        <div class="flex items-center gap-2">
          <NuxtLink to="/game">
            <UButton
              variant="outline"
              color="neutral"
              size="sm"
              icon="i-lucide-arrow-left"
            >Back to Game</UButton>
          </NuxtLink>
        </div>
      </div>

      <!-- No data -->
      <div
        v-if="game.handHistory.length === 0"
        class="text-center py-20 space-y-4"
      >
        <p class="text-gray-400">
          No hands recorded yet.
        </p>
        <NuxtLink to="/game">
          <UButton
            color="primary"
            class="mt-4"
          >Play Your First Hand</UButton>
        </NuxtLink>
      </div>

      <template v-else>
        <!-- Tab bar -->
        <div class="flex border-b border-gray-800 mb-6 gap-1">
          <button
            v-for="tab in (['overview', 'hands'] as const)"
            :key="tab"
            class="px-5 py-2.5 text-sm font-medium capitalize transition-all rounded-t-lg"
            :class="activeTab === tab
              ? 'text-white bg-gray-800/60 border-b-2 border-primary-500'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/30'"
            @click="activeTab = tab"
          >
            {{ tab }}
            <span
              v-if="tab === 'hands'"
              class="ml-1.5 text-[0.6rem] bg-gray-700/60 px-1.5 py-0.5 rounded-full"
            >{{ game.handHistory.length }}</span>
          </button>
        </div>

        <!-- OVERVIEW -->
        <div
          v-if="activeTab === 'overview'"
          class="space-y-6"
        >
          <!-- Headline stat -->
          <div class="bg-gradient-to-br from-gray-900 to-gray-900/60 border border-gray-800 rounded-2xl p-6 flex items-center justify-between">
            <div>
              <div class="text-xs text-gray-400 uppercase tracking-wider mb-1">
                Session Result
              </div>
              <div
                class="text-4xl font-bold font-mono"
                :class="(game.stats.totalReturned - game.stats.totalWagered) >= 0 ? 'text-green-400' : 'text-red-400'"
              >
                {{ (game.stats.totalReturned - game.stats.totalWagered) >= 0 ? '+' : '' }}${{ ((game.stats.totalReturned - game.stats.totalWagered) * game.denomination).toFixed(2) }}
              </div>
            </div>
            <div class="text-right space-y-1">
              <div class="text-sm text-gray-400">
                {{ game.stats.handsPlayed }} hands
              </div>
              <div class="text-sm text-gray-400">
                {{ game.effectiveReturn.toFixed(1) }}% return
              </div>
            </div>
          </div>

          <!-- Key metrics -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="bg-gray-900/60 border border-gray-800/60 rounded-xl p-4">
              <div class="text-[0.65rem] text-gray-400 uppercase tracking-wider mb-2">
                Won
              </div>
              <div class="text-2xl font-bold font-mono text-green-400">
                {{ game.stats.handsWon }}
              </div>
            </div>
            <div class="bg-gray-900/60 border border-gray-800/60 rounded-xl p-4">
              <div class="text-[0.65rem] text-gray-400 uppercase tracking-wider mb-2">
                Lost
              </div>
              <div class="text-2xl font-bold font-mono text-red-400">
                {{ game.stats.handsPlayed - game.stats.handsWon }}
              </div>
            </div>
            <div class="bg-gray-900/60 border border-gray-800/60 rounded-xl p-4">
              <div class="text-[0.65rem] text-gray-400 uppercase tracking-wider mb-2">
                Mistakes
              </div>
              <div
                class="text-2xl font-bold font-mono"
                :class="game.stats.totalMistakes > 0 ? 'text-amber-400' : 'text-green-400'"
              >
                {{ game.stats.totalMistakes }}
              </div>
            </div>
            <div class="bg-gray-900/60 border border-gray-800/60 rounded-xl p-4">
              <div class="text-[0.65rem] text-gray-400 uppercase tracking-wider mb-2">
                EV Lost
              </div>
              <div
                class="text-2xl font-bold font-mono"
                :class="game.stats.totalEVLost > 0 ? 'text-red-400' : 'text-green-400'"
              >
                ${{ game.stats.totalEVLost.toFixed(2) }}
              </div>
            </div>
          </div>

          <!-- Profit trend -->
          <div
            v-if="profitTimeline.length > 1"
            class="bg-gray-900/60 border border-gray-800/60 rounded-xl p-5"
          >
            <div class="flex items-center justify-between mb-3">
              <span class="text-[0.65rem] text-gray-400 uppercase tracking-wider">Profit Trend</span>
              <span
                :class="profitTimeline[profitTimeline.length - 1]! >= 0 ? 'text-green-400' : 'text-red-400'"
                class="text-sm font-mono font-bold"
              >
                {{ profitTimeline[profitTimeline.length - 1]! >= 0 ? '+' : '' }}${{ profitTimeline[profitTimeline.length - 1]!.toFixed(2) }}
              </span>
            </div>
            <div class="flex items-end gap-[2px] h-20">
              <div
                v-for="(val, i) in profitTimeline"
                :key="i"
                class="flex-1 rounded-t-sm transition-all"
                :class="val >= 0 ? 'bg-green-500/60' : 'bg-red-500/60'"
                :style="{ height: `${Math.max(4, Math.abs(val) / profitTimelineMaxAbs * 100)}%` }"
              />
            </div>
            <div class="flex justify-between text-[0.6rem] text-gray-400 mt-1">
              <span>Hand #1</span>
              <span>Hand #{{ game.handHistory.length }}</span>
            </div>
          </div>

          <!-- Biggest hands -->
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-gray-900/40 border border-gray-800/40 rounded-xl p-3 text-center">
              <div class="text-lg font-bold font-mono text-green-400">
                ${{ biggestWin.toFixed(2) }}
              </div>
              <div class="text-[0.6rem] text-gray-400 uppercase">
                Biggest Win
              </div>
            </div>
            <div class="bg-gray-900/40 border border-gray-800/40 rounded-xl p-3 text-center">
              <div class="text-lg font-bold font-mono text-red-400">
                -${{ biggestLoss.toFixed(2) }}
              </div>
              <div class="text-[0.6rem] text-gray-400 uppercase">
                Per-Hand Risk
              </div>
            </div>
          </div>

          <!-- Bot comparison (if session ended) -->
          <div
            v-if="game.personaResults.length > 0"
            class="bg-gray-900/60 border border-gray-800/60 rounded-xl p-5"
          >
            <div class="text-[0.65rem] text-gray-400 uppercase tracking-wider mb-3">
              Bot Comparison
            </div>
            <PersonaComparison />
          </div>

          <!-- Mistake summary -->
          <div
            v-if="mistakeHands.length > 0"
            class="bg-gray-900/60 border border-gray-800/60 rounded-xl p-5"
          >
            <div class="flex items-center justify-between mb-3">
              <span class="text-[0.65rem] text-gray-400 uppercase tracking-wider">Mistakes ({{ mistakeHands.length }})</span>
              <span class="text-xs text-red-400 font-mono font-bold">${{ game.stats.totalEVLost.toFixed(2) }} total</span>
            </div>
            <div class="space-y-1.5">
              <button
                v-for="h in mistakeHands.slice(0, 10)"
                :key="h.handNumber"
                class="w-full text-left flex items-center gap-2 text-xs bg-red-900/10 border border-red-800/20 rounded-lg px-3 py-2 hover:bg-red-900/20 transition-colors"
                @click="activeTab = 'hands'; expandedHand = h.handNumber"
              >
                <span class="text-gray-400 font-mono w-8">#{{ h.handNumber }}</span>
                <span class="text-white font-mono flex-1">{{ formatCards(h.dealtCards) }}</span>
                <span class="text-red-400 font-mono font-bold">-${{ h.mistakeCost.toFixed(2) }}</span>
                <span class="text-gray-500">&rsaquo;</span>
              </button>
            </div>
          </div>

          <!-- Export -->
          <div class="flex items-center justify-between pt-4 border-t border-gray-800/40">
            <UButton
              variant="outline"
              color="neutral"
              size="xs"
              icon="i-lucide-download"
              @click="exportHandHistory"
            >
              Export Hand History
            </UButton>
          </div>
        </div>

        <!-- HANDS -->
        <div
          v-if="activeTab === 'hands'"
          class="space-y-2"
        >
          <div
            v-for="h in reversedHistory"
            :key="h.handNumber"
            class="bg-gray-900/60 border rounded-xl overflow-hidden transition-colors"
            :class="h.mistakeCost > 0.001 ? 'border-red-800/30' : 'border-gray-800/60'"
          >
            <!-- Hand summary row -->
            <button
              class="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-800/20 transition-colors"
              @click="expandedHand = expandedHand === h.handNumber ? null : h.handNumber"
            >
              <span class="text-xs text-gray-400 font-mono w-8">#{{ h.handNumber }}</span>
              <span class="font-mono text-white text-sm flex-1">{{ formatCards(h.dealtCards) }}</span>
              <span
                v-if="h.mistakeCost > 0.001"
                class="text-[0.55rem] px-1.5 py-0.5 rounded bg-red-900/40 text-red-400"
              >MISTAKE</span>
              <span
                class="px-2 py-0.5 rounded text-[0.6rem] font-bold uppercase w-20 text-center"
                :class="h.payout > 0
                  ? 'bg-green-900/40 text-green-400'
                  : 'bg-gray-800/60 text-gray-400'"
              >
                {{ h.handResult || 'No Win' }}
              </span>
              <span
                class="font-mono text-sm w-16 text-right font-bold"
                :class="h.payout > 0 ? 'text-green-400' : 'text-red-400'"
              >
                {{ h.payout > 0 ? '+' : '-' }}${{ ((h.payout > 0 ? h.payout : game.coinsBet) * game.denomination).toFixed(2) }}
              </span>
              <span class="text-gray-500 text-xs">{{ expandedHand === h.handNumber ? '&#9660;' : '&#9654;' }}</span>
            </button>

            <!-- Expanded detail -->
            <div
              v-if="expandedHand === h.handNumber"
              class="border-t border-gray-800/30 px-4 py-4 bg-gray-800/10 space-y-3"
            >
              <div class="grid grid-cols-2 gap-3">
                <div class="bg-gray-900/50 rounded-lg p-3">
                  <div class="text-[0.6rem] text-gray-400 uppercase mb-1">
                    Dealt
                  </div>
                  <div class="font-mono text-white">
                    {{ formatCards(h.dealtCards) }}
                  </div>
                </div>
                <div class="bg-gray-900/50 rounded-lg p-3">
                  <div class="text-[0.6rem] text-gray-400 uppercase mb-1">
                    Final Hand
                  </div>
                  <div class="font-mono text-white">
                    {{ formatCards(h.finalCards) }}
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="bg-gray-900/50 rounded-lg p-3">
                  <div class="text-[0.6rem] text-gray-400 uppercase mb-1">
                    You Held
                  </div>
                  <div class="font-mono text-white">
                    {{ h.playerHeld.length > 0 ? h.playerHeld.map(i => cardLabel(h.dealtCards[i]!)).join(' ') : '(drew 5 new)' }}
                  </div>
                  <div class="text-[0.55rem] text-gray-400 font-mono mt-1">
                    EV: {{ h.playerEV.toFixed(4) }}
                  </div>
                </div>
                <div
                  class="bg-gray-900/50 rounded-lg p-3"
                  :class="h.mistakeCost > 0.001 ? 'border border-green-800/30' : ''"
                >
                  <div
                    class="text-[0.6rem] uppercase mb-1"
                    :class="h.mistakeCost > 0.001 ? 'text-green-400' : 'text-gray-400'"
                  >
                    Optimal
                  </div>
                  <div
                    class="font-mono"
                    :class="h.mistakeCost > 0.001 ? 'text-green-400' : 'text-white'"
                  >
                    {{ h.optimalHeld.length > 0 ? h.optimalHeld.map(i => cardLabel(h.dealtCards[i]!)).join(' ') : '(drew 5 new)' }}
                  </div>
                  <div
                    class="text-[0.55rem] font-mono mt-1"
                    :class="h.mistakeCost > 0.001 ? 'text-green-400' : 'text-gray-400'"
                  >
                    EV: {{ h.optimalEV.toFixed(4) }}
                  </div>
                </div>
              </div>

              <div
                v-if="h.mistakeCost > 0.001"
                class="bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2 flex items-center justify-between"
              >
                <span class="text-xs text-red-400">Mistake cost</span>
                <span class="text-sm text-red-400 font-mono font-bold">${{ h.mistakeCost.toFixed(2) }}</span>
              </div>

              <div class="flex items-center justify-between text-xs text-gray-400">
                <span>Result: <strong :class="h.payout > 0 ? 'text-green-400' : 'text-gray-400'">{{ h.handResult || 'No Win' }}</strong></span>
                <span
                  v-if="h.payout > 0"
                  class="text-green-400 font-mono font-bold"
                >+${{ (h.payout * game.denomination).toFixed(2) }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Footer -->
      <AppFooter />
    </div>
  </div>
</template>
