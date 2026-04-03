<script setup lang="ts">
import { PAY_TABLES, PAY_TABLE_GROUPS } from '~/utils/payTables'
import { VARIANT_RULES } from '~/utils/variantRules'

const game = useGameStore()
const router = useRouter()

const selectedTable = ref(game.payTableId)
const rulesOpen = ref(false)
const rulesVariant = ref('')

const selectedPayTable = computed(() => PAY_TABLES[selectedTable.value] ?? PAY_TABLES['job-9-6']!)
const selectedRules = computed(() => VARIANT_RULES[selectedPayTable.value?.variant] ?? null)

// Which group is currently selected?
const selectedGroup = computed(() =>
  PAY_TABLE_GROUPS.find(g => g.tables.includes(selectedTable.value))
)

function selectGroup(group: typeof PAY_TABLE_GROUPS[number]) {
  // Select the first (best) pay table in the group
  selectedTable.value = group.tables[0]!
}

function openRules(variant: string) {
  rulesVariant.value = variant
  rulesOpen.value = true
}

function startGame(tableId?: string) {
  const id = tableId || selectedTable.value
  selectedTable.value = id
  game.setPayTable(id)
  game.resetSession()
  router.push('/game')
}
</script>

<template>
  <div class="min-h-screen bg-gray-950 text-white">
    <div class="max-w-4xl mx-auto p-6 space-y-6">
      <div class="text-center space-y-1">
        <h1 class="text-3xl font-bold text-white">Video Poker Trainer</h1>
        <p class="text-gray-400 text-sm">
          Choose your variant, pay table, and denomination to begin
        </p>
      </div>

      <!-- Variant grid — 3 columns -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="group in PAY_TABLE_GROUPS"
          :key="group.variant"
          class="rounded-lg px-4 py-3 border transition-all space-y-2 cursor-pointer"
          :class="selectedGroup?.variant === group.variant
            ? 'border-primary-500 bg-primary-500/10'
            : 'border-gray-700/40 bg-gray-800/40 hover:border-gray-600'"
          @click="selectGroup(group)"
        >
          <div class="flex items-center justify-between">
            <h2
              class="text-sm font-semibold"
              :class="selectedGroup?.variant === group.variant ? 'text-white' : 'text-gray-200'"
            >
              {{ group.variant }}
            </h2>
            <span
              class="text-[0.6rem] font-mono tabular-nums px-1.5 py-0.5 rounded"
              :class="PAY_TABLES[group.tables[0]!]!.returnPct >= 100
                ? 'bg-green-900/40 text-green-400'
                : selectedGroup?.variant === group.variant
                  ? 'bg-primary-900/40 text-primary-400'
                  : 'bg-gray-800 text-gray-400'"
            >
              {{ PAY_TABLES[group.tables[0]!]!.returnPct }}%
            </span>
          </div>
          <p class="text-[0.7rem] text-gray-500 leading-snug">{{ group.description }}</p>
          <div class="text-[0.6rem] text-gray-600">
            {{ PAY_TABLES[group.tables[0]!]!.classifier === 'deucesWild' ? 'Wild cards' : 'Standard deck' }}
            &middot; {{ group.tables.length }} pay table{{ group.tables.length > 1 ? 's' : '' }}
          </div>
          <div class="flex gap-2 pt-1">
            <button
              class="flex-1 text-[0.7rem] font-semibold py-1.5 rounded-md transition-all"
              :class="selectedGroup?.variant === group.variant
                ? 'bg-primary-500 text-white hover:bg-primary-400'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'"
              @click.stop="startGame(group.tables[0]!)"
            >
              Play Now
            </button>
            <button
              class="text-[0.7rem] font-semibold py-1.5 px-3 rounded-md border border-gray-600 text-gray-400 hover:text-white hover:border-gray-500 transition-all"
              @click.stop="openRules(group.variant)"
            >
              Rules
            </button>
          </div>
        </div>
      </div>

      <!-- Pay table sub-selection (if variant has multiple) -->
      <div v-if="selectedGroup && selectedGroup.tables.length > 1" class="bg-gray-800/40 border border-gray-700/30 rounded-lg px-4 py-3 space-y-2">
        <label class="text-sm font-medium text-gray-300 block">
          {{ selectedGroup.variant }} Pay Tables
        </label>
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="tableId in selectedGroup.tables"
            :key="tableId"
            class="flex flex-col items-center px-3 py-2 rounded-md border transition-all font-mono"
            :class="selectedTable === tableId
              ? 'border-primary-500 bg-primary-500/10 text-white'
              : 'border-gray-700/50 bg-gray-900/60 text-gray-300 hover:border-gray-600'"
            @click="selectedTable = tableId"
          >
            <span class="text-sm font-bold tabular-nums">
              {{ PAY_TABLES[tableId]!.shortName }}
            </span>
            <span
              class="text-xs tabular-nums mt-0.5"
              :class="selectedTable === tableId
                ? 'text-primary-400'
                : PAY_TABLES[tableId]!.returnPct >= 100
                  ? 'text-green-400'
                  : 'text-gray-500'"
            >
              {{ PAY_TABLES[tableId]!.returnPct }}%
            </span>
          </button>
        </div>
      </div>

      <!-- Selected variant summary -->
      <div class="bg-gray-800/60 border border-primary-500/20 rounded-lg px-4 py-3 space-y-2">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-semibold text-white">
              {{ selectedPayTable.variant }}
              <span class="text-primary-400 font-mono ml-1">{{ selectedPayTable.shortName }}</span>
            </div>
            <div class="text-xs text-gray-400 mt-0.5">
              Return: <span class="font-mono tabular-nums" :class="selectedPayTable.returnPct >= 100 ? 'text-green-400' : 'text-gray-300'">{{ selectedPayTable.returnPct }}%</span>
              <span class="mx-1.5 text-gray-600">&middot;</span>
              {{ selectedPayTable.classifier === 'deucesWild' ? 'Wild card game' : 'Standard deck' }}
              <span class="mx-1.5 text-gray-600">&middot;</span>
              Min. hand: {{ selectedRules?.minPayingHand || 'Jacks or Better' }}
            </div>
          </div>
          <button
            class="text-xs text-primary-400 hover:text-primary-300 transition-colors font-semibold"
            @click="openRules(selectedPayTable.variant)"
          >
            View Rules
          </button>
        </div>
        <p v-if="selectedRules" class="text-xs text-gray-500 leading-relaxed">
          {{ selectedRules.overview.slice(0, 200) }}{{ selectedRules.overview.length > 200 ? '...' : '' }}
        </p>
      </div>

      <!-- Rules modal (can open for any variant) -->
      <RulesModal v-model:open="rulesOpen" :variant="rulesVariant" />

      <!-- Denomination selector -->
      <div class="bg-gray-800/40 border border-gray-700/30 rounded-lg px-4 py-3">
        <label class="text-sm font-medium text-gray-300 mb-2 block">Denomination</label>
        <div class="flex gap-2">
          <button
            v-for="d in [0.25, 0.50, 1.00]"
            :key="d"
            class="px-4 py-1.5 rounded-md border font-mono text-sm transition-all tabular-nums"
            :class="game.denomination === d
              ? 'border-primary-500 bg-primary-500/10 text-white'
              : 'border-gray-700/50 bg-gray-900/60 text-gray-400 hover:border-gray-600'"
            @click="game.denomination = d"
          >
            ${{ d.toFixed(2) }}
          </button>
        </div>
      </div>

      <!-- Start button -->
      <UButton size="xl" color="primary" block @click="startGame">
        PLAY {{ selectedPayTable.variant }}
        ({{ selectedPayTable.shortName }})
      </UButton>

      <!-- Footer nav -->
      <div class="border-t border-gray-800 pt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
        <NuxtLink to="/game" class="hover:text-gray-300 transition-colors">Game</NuxtLink>
        <span>&middot;</span>
        <NuxtLink to="/analysis" class="hover:text-gray-300 transition-colors">Analysis</NuxtLink>
        <AnalysisStatus />
        <span>&middot;</span>
        <a href="https://github.com/cschweda/metaincognita-video-poker" target="_blank" rel="noopener" class="hover:text-gray-300 transition-colors flex items-center gap-1">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          GitHub
        </a>
      </div>
    </div>
  </div>
</template>
