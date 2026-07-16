<script setup lang="ts">
import { PERSONAS } from '~/utils/botPersonas'
import { returnTier, RETURN_TIER_TEXT, formatSignedDollars } from '~/utils/format'

// One source for the bot-comparison rows — this block used to be
// implemented twice (TrainingPanel + history page) with triplicated
// return-tier thresholds and net math.
withDefaults(defineProps<{
  showIntro?: boolean
  showNote?: boolean
}>(), {
  showIntro: false,
  showNote: false
})

const game = useGameStore()

interface ComparisonRow {
  key: string
  name: string
  style: string
  returnPct: number
  netCoins: number
  isYou: boolean
}

const rows = computed<ComparisonRow[]>(() => [
  {
    key: 'you',
    name: 'You',
    style: 'Your actual plays',
    returnPct: game.effectiveReturn,
    netCoins: game.stats.totalReturned - game.stats.totalWagered,
    isYou: true
  },
  ...game.personaResults.map(pr => ({
    key: pr.personaId,
    name: pr.personaName,
    style: PERSONAS.find(p => p.id === pr.personaId)?.style ?? '',
    returnPct: pr.returnPct,
    netCoins: pr.totalPayout - pr.totalWagered,
    isYou: false
  }))
])
</script>

<template>
  <div>
    <p
      v-if="showIntro"
      class="text-xs text-gray-400 leading-relaxed mb-3"
    >
      Your {{ game.stats.handsPlayed }} dealt hands replayed through 4 player personas.
      Same cards, different strategies — same luck, different skill.
    </p>

    <div class="space-y-2">
      <div
        v-for="row in rows"
        :key="row.key"
        class="flex items-center justify-between rounded-lg px-3 py-2"
        :class="row.isYou
          ? 'bg-blue-900/20 border border-blue-800/30'
          : 'bg-gray-800/40'"
      >
        <div>
          <span
            class="text-sm font-semibold"
            :class="row.isYou ? 'text-white' : 'text-gray-200'"
          >{{ row.name }}</span>
          <span class="text-[0.6rem] text-gray-400 ml-2">{{ row.style }}</span>
        </div>
        <div class="flex items-center gap-3 font-mono text-sm">
          <span
            class="font-bold"
            :class="RETURN_TIER_TEXT[returnTier(row.returnPct)]"
          >
            {{ row.returnPct.toFixed(2) }}%
          </span>
          <span :class="row.netCoins >= 0 ? 'text-green-400' : 'text-red-400'">
            {{ formatSignedDollars(row.netCoins, game.denomination) }}
          </span>
        </div>
      </div>
    </div>

    <p
      v-if="showNote"
      class="text-xs text-gray-400 leading-relaxed mt-3"
    >
      The gap between you and Perfect Pat is the dollar value of your mistakes.
      The gap between Pat and Gary is the dollar value of learning strategy.
    </p>
  </div>
</template>
