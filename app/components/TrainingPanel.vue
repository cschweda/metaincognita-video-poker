<script setup lang="ts">
// Phase-switch shell for the training sidebar. Each phase's content lives
// in a focused child under components/training/; the shared hold-options
// table and bot comparison are app-level components (also used elsewhere).
const game = useGameStore()

const showAllOptions = ref(false)
const showHistory = ref(false)
</script>

<template>
  <div class="training-panel">
    <!-- PHASE: idle — waiting for deal -->
    <template v-if="game.phase === 'idle'">
      <div class="tp-section">
        <div class="tp-phase-title">
          Ready to Play
        </div>
        <div class="tp-phase-desc">
          Click <strong>DEAL</strong> to begin.
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
      <!-- Analysis failed: say so instead of spinning forever -->
      <div
        v-if="!game.optimalPlay && game.analysisError"
        class="tp-section"
      >
        <div class="tp-phase-title">
          Analysis unavailable
        </div>
        <div class="tp-phase-desc">
          This hand couldn't be analyzed — hold and draw as usual;
          the next deal will retry the analyzer.
        </div>
      </div>

      <!-- Show spinner if EV not ready yet -->
      <div
        v-else-if="!game.optimalPlay"
        class="tp-section"
      >
        <div class="tp-phase-title">
          <span class="tp-spinner" />
          Computing optimal play...
        </div>
        <div class="tp-phase-desc">
          Analyzing all 32 hold combinations
        </div>
      </div>

      <!-- EV results ready -->
      <template v-else>
        <div class="tp-section">
          <div class="tp-rec-label">
            OPTIMAL PLAY
          </div>
          <TrainingOptimalPlay />
        </div>

        <div class="tp-section">
          <div class="tp-rec-label">
            YOUR CURRENT SELECTION
          </div>
          <TrainingCurrentSelection />
        </div>

        <div class="tp-section">
          <div class="tp-rec-label">
            TOP HOLD OPTIONS
          </div>
          <HoldOptionsTable
            :options="game.allHoldOptions"
            :limit="5"
            :highlight="game.currentHoldAnalysis"
            highlight-variant="current"
            :delta-decimals="3"
          />
        </div>
      </template>
    </template>

    <!-- PHASE: drawing — cards being replaced -->
    <template v-if="game.phase === 'drawing'">
      <div class="tp-section">
        <div class="tp-phase-title">
          Drawing...
        </div>
      </div>
    </template>

    <!-- PHASE: result — full analysis -->
    <template v-if="game.phase === 'result'">
      <div class="tp-section">
        <TrainingResultBanner />
      </div>

      <div
        v-if="game.handHistory.length > 0"
        class="tp-section"
      >
        <div class="tp-rec-label">
          HAND RECAP
        </div>
        <TrainingHandRecap />
      </div>

      <!-- All 32 options -->
      <div class="tp-section">
        <button
          class="tp-toggle"
          @click="showAllOptions = !showAllOptions"
        >
          {{ showAllOptions ? 'Hide' : 'Show all' }} 32 options
          <span class="tp-toggle-arrow">{{ showAllOptions ? '&#9650;' : '&#9660;' }}</span>
        </button>

        <HoldOptionsTable
          v-if="showAllOptions"
          :options="game.allHoldOptions"
          :highlight="game.playerAnalysis"
          highlight-variant="player"
          :delta-decimals="4"
        />
      </div>
    </template>

    <!-- Session stats — always visible when hands have been played -->
    <div
      v-if="game.stats.handsPlayed > 0"
      class="tp-section"
    >
      <div class="tp-rec-label">
        SESSION
      </div>
      <TrainingSessionStats />
    </div>

    <!-- Hand history — always available when hands have been played -->
    <div
      v-if="game.handHistory.length > 0"
      class="tp-section"
    >
      <button
        class="tp-toggle"
        @click="showHistory = !showHistory"
      >
        Hand History ({{ game.handHistory.length }})
        <span class="tp-toggle-arrow">{{ showHistory ? '&#9650;' : '&#9660;' }}</span>
      </button>

      <TrainingHandHistoryList v-if="showHistory" />
    </div>

    <!-- PERSONA COMPARISON — shown after End Session -->
    <div
      v-if="game.sessionEnded && game.personaResults.length > 0"
      id="bot-comparison"
      class="tp-section"
    >
      <div class="tp-rec-label">
        BOT COMPARISON
      </div>
      <PersonaComparison
        show-intro
        show-note
      />

      <button
        class="tp-new-session"
        @click="game.resetSession()"
      >
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
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tp-section {
  border-bottom: 1px solid rgba(55, 65, 81, 0.5);
  padding-bottom: 12px;
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

/* Section labels */
.tp-rec-label {
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: #818cf8;
  text-transform: uppercase;
  margin-bottom: 6px;
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

.tp-toggle:focus-visible {
  outline: 2px solid var(--vp-gold-bright);
  outline-offset: 2px;
}

.tp-toggle-arrow {
  font-size: 0.6rem;
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
  color: var(--vp-win);
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
}

.tp-new-session:hover {
  background: rgba(74, 222, 128, 0.3);
}

.tp-new-session:focus-visible {
  outline: 2px solid var(--vp-gold-bright);
  outline-offset: 2px;
}
</style>
