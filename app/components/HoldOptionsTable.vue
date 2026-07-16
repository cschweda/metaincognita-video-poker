<script setup lang="ts">
import type { HoldAnalysis } from '~/utils/evCalculator'
import { formatHeldCards } from '~/utils/evCalculator'

// The ranked hold-options table, shown twice per hand (top-5 while deciding,
// all 32 on the result screen) — previously two copies of the same markup.
const props = withDefaults(defineProps<{
  options: HoldAnalysis[]
  /** Show only the first N options (omit for all) */
  limit?: number
  /** Hold to highlight (the live selection or the player's final play) */
  highlight?: HoldAnalysis | null
  /** Skin for the highlighted row: blue "current" vs gold "player" */
  highlightVariant?: 'current' | 'player'
  /** Decimals for the Δ-vs-best column */
  deltaDecimals?: number
}>(), {
  limit: undefined,
  highlight: null,
  highlightVariant: 'current',
  deltaDecimals: 4
})

const visible = computed(() =>
  props.limit ? props.options.slice(0, props.limit) : props.options
)

function isHighlighted(opt: HoldAnalysis): boolean {
  const h = props.highlight
  if (!h) return false
  return opt.heldIndices.length === h.heldIndices.length
    && opt.heldIndices.every(idx => h.heldIndices.includes(idx))
}

function delta(opt: HoldAnalysis, index: number): string {
  if (index === 0) return '—'
  return (-(props.options[0]!.expectedValue - opt.expectedValue)).toFixed(props.deltaDecimals)
}
</script>

<template>
  <div class="hot-list">
    <div class="hot-header">
      <span class="hot-rank">#</span>
      <span class="hot-hold">Hold</span>
      <span class="hot-ev">EV</span>
      <span class="hot-delta">&#916;</span>
    </div>
    <div
      v-for="(opt, i) in visible"
      :key="opt.heldIndices.join('-') || 'none'"
      class="hot-row"
      :class="{
        'hot-row--optimal': i === 0,
        'hot-row--current': highlightVariant === 'current' && isHighlighted(opt),
        'hot-row--player': highlightVariant === 'player' && isHighlighted(opt)
      }"
    >
      <span class="hot-rank">{{ i + 1 }}</span>
      <span class="hot-hold">{{ formatHeldCards(opt) }}</span>
      <span class="hot-ev">{{ opt.expectedValue.toFixed(4) }}</span>
      <span class="hot-delta">{{ delta(opt, i) }}</span>
    </div>
  </div>
</template>

<style scoped>
.hot-list {
  margin-top: 8px;
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
}

.hot-header {
  display: grid;
  grid-template-columns: 28px 1fr 64px 52px;
  gap: 4px;
  padding: 4px 6px;
  color: #6b7280;
  font-weight: 400;
  border-bottom: 1px solid rgba(55, 65, 81, 0.5);
}

.hot-row {
  display: grid;
  grid-template-columns: 28px 1fr 64px 52px;
  gap: 4px;
  padding: 3px 6px;
  border-radius: 3px;
}

.hot-row--optimal {
  background: rgba(22, 101, 52, 0.2);
  font-weight: 700;
}

.hot-row--current {
  background: rgba(30, 64, 175, 0.2);
  outline: 1px solid rgba(96, 165, 250, 0.3);
}

.hot-row--player {
  background: rgba(146, 112, 12, 0.2);
  outline: 1px solid rgba(201, 162, 39, 0.3);
}

.hot-row--current.hot-row--optimal,
.hot-row--player.hot-row--optimal {
  background: rgba(22, 101, 52, 0.2);
  outline: 1px solid rgba(74, 222, 128, 0.3);
}

.hot-rank {
  color: #6b7280;
  text-align: right;
  padding-right: 4px;
}

.hot-ev,
.hot-delta {
  text-align: right;
}
</style>
