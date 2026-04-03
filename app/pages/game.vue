<script setup lang="ts">
import { PAY_TABLES, PAY_TABLE_GROUPS } from '~/utils/payTables'

const game = useGameStore()
const rulesOpen = ref(false)

const currentGroup = computed(() =>
  PAY_TABLE_GROUPS.find(g => g.tables.includes(game.payTableId))
)

const currentVariantName = computed(() => game.payTable.variant)

function onGlobalKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  if (target.closest('.card') || target.closest('.hold-btn') || target.closest('.ctrl-btn')) return

  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault()
    game.dealOrDraw()
  }
}

// --- Session timeout (5 min inactivity) ---
let timeoutTimer: ReturnType<typeof setTimeout> | null = null
const TIMEOUT_MS = 5 * 60 * 1000

function resetTimeout() {
  if (timeoutTimer) clearTimeout(timeoutTimer)
  timeoutTimer = setTimeout(() => {
    if (game.stats.handsPlayed > 0 && !game.sessionEnded) {
      game.endSession()
    }
  }, TIMEOUT_MS)
}

function onActivity() {
  resetTimeout()
}

// Save on tab close / navigate away
function onBeforeUnload() {
  if (game.stats.handsPlayed > 0) {
    game.saveToLocalStorage()
  }
}

// Save + end session on visibility hidden (tab switch, minimize)
function onVisibilityChange() {
  if (document.hidden && game.stats.handsPlayed > 0) {
    game.saveToLocalStorage()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onGlobalKeydown)
  document.addEventListener('click', onActivity)
  document.addEventListener('keydown', onActivity)
  window.addEventListener('beforeunload', onBeforeUnload)
  document.addEventListener('visibilitychange', onVisibilityChange)
  resetTimeout()

  // Try to restore previous session
  game.loadFromLocalStorage()
})

onUnmounted(() => {
  document.removeEventListener('keydown', onGlobalKeydown)
  document.removeEventListener('click', onActivity)
  document.removeEventListener('keydown', onActivity)
  window.removeEventListener('beforeunload', onBeforeUnload)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  if (timeoutTimer) clearTimeout(timeoutTimer)
})
</script>

<template>
  <div class="vp-page">
    <!-- TOP NAV -->
    <div class="vp-nav">
      <div class="vp-nav__inner">
        <button
          v-for="group in PAY_TABLE_GROUPS"
          :key="group.variant"
          class="vp-nav__tab"
          :class="{ 'vp-nav__tab--active': group.tables.includes(game.payTableId) }"
          :disabled="!game.canBet"
          @click="game.setPayTable(group.tables[0]!)"
        >
          {{ group.variant }}
        </button>
        <button class="vp-nav__tab" @click="rulesOpen = true">
          Rules
        </button>
      </div>
      <div
        v-if="currentGroup && currentGroup.tables.length > 1"
        class="vp-nav__inner vp-nav__sub"
      >
        <button
          v-for="tableId in currentGroup.tables"
          :key="tableId"
          class="vp-nav__subtab"
          :class="{ 'vp-nav__subtab--active': game.payTableId === tableId }"
          :disabled="!game.canBet"
          @click="game.setPayTable(tableId)"
        >
          {{ PAY_TABLES[tableId]!.shortName }}
          ({{ PAY_TABLES[tableId]!.returnPct }}%)
        </button>
      </div>
    </div>

    <RulesModal v-model:open="rulesOpen" :variant="currentVariantName" />

    <!-- MAIN: three columns -->
    <div class="vp-main">
      <div class="vp-col-left">
        <BankrollPanel />
      </div>
      <div class="vp-col-center">
        <Machine />
      </div>
      <div class="vp-col-right">
        <TrainingPanel />
      </div>
    </div>

    <!-- BOTTOM FOOTER -->
    <div class="vp-footer">
      <div class="vp-footer__inner">
        <NuxtLink to="/" class="vp-footer__link">Home</NuxtLink>
        <span class="vp-footer__dot">&middot;</span>
        <NuxtLink to="/analysis" class="vp-footer__link">Analysis</NuxtLink>
        <AnalysisStatus />
        <span class="vp-footer__dot">&middot;</span>
        <a href="https://github.com/cschweda/metaincognita-video-poker" target="_blank" rel="noopener" class="vp-footer__link vp-footer__link--gh">
          <svg class="vp-footer__gh-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          GitHub
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Page shell — NOT flexbox column, just a plain block so children can be independently centered */
.vp-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #080812 0%, #121224 40%, #080812 100%);
}

/* NAV — absolutely positioned at top, full viewport width, text-align centered */
.vp-nav {
  width: 100%;
  padding: 12px 16px 8px;
  text-align: center;
}

.vp-nav__inner {
  display: inline-flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}

.vp-nav__sub {
  margin-top: 6px;
}

.vp-nav__tab {
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid rgba(51, 51, 88, 1);
  background: rgba(20, 20, 40, 0.9);
  color: #6666aa;
  font-size: 0.68rem;
  font-family: 'Fira Code', monospace;
  cursor: pointer;
  transition: all 0.15s;
}

.vp-nav__tab:disabled {
  opacity: 0.4;
  cursor: default;
}

.vp-nav__tab--active {
  border-color: #c9a227;
  background: rgba(201, 162, 39, 0.12);
  color: #ffd60a;
}

.vp-nav__subtab {
  padding: 3px 10px;
  border-radius: 4px;
  border: 1px solid rgba(40, 40, 74, 1);
  background: rgba(20, 20, 40, 0.7);
  color: #5560a0;
  font-size: 0.6rem;
  font-family: 'Fira Code', monospace;
  cursor: pointer;
  transition: all 0.15s;
}

.vp-nav__subtab:disabled {
  opacity: 0.4;
  cursor: default;
}

.vp-nav__subtab--active {
  border-color: #c9a227;
  color: #ffd60a;
  background: rgba(201, 162, 39, 0.08);
}

/* MAIN — three columns, centered as a group */
.vp-main {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 8px 16px;
  align-items: flex-start;
}

.vp-col-left,
.vp-col-right {
  width: 280px;
  flex-shrink: 0;
  position: sticky;
  top: 12px;
  max-height: calc(100vh - 24px);
  overflow-y: auto;
}

.vp-col-center {
  flex-shrink: 0;
}

/* FOOTER — full viewport width, text-align centered. NOT inside any flex container. */
.vp-footer {
  width: 100%;
  padding: 16px;
  border-top: 1px solid rgba(55, 65, 81, 0.5);
  text-align: center;
}

.vp-footer__inner {
  display: inline-flex;
  align-items: center;
  gap: 16px;
}

.vp-footer__link {
  color: #9ca3af;
  font-size: 0.75rem;
  text-decoration: none;
  transition: color 0.15s;
}

.vp-footer__link:hover {
  color: #e5e7eb;
}

.vp-footer__link--gh {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.vp-footer__gh-icon {
  width: 14px;
  height: 14px;
}

.vp-footer__dot {
  color: #4b5563;
  font-size: 0.75rem;
}
</style>
