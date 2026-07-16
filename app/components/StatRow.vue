<script setup lang="ts">
// Label/value stat row with an explanatory tooltip. The trigger is a real
// button so the explanation opens on keyboard focus too — these definitions
// (EV Lost, Return, $/hr…) are teaching content, not hover garnish.
withDefaults(defineProps<{
  label: string
  value: string
  tooltip: string
  valueClass?: string
}>(), {
  valueClass: ''
})
</script>

<template>
  <UTooltip :text="tooltip">
    <button
      type="button"
      class="stat-row"
      :aria-label="`${label}: ${value}. ${tooltip}`"
    >
      <span class="stat-row__label">{{ label }}</span>
      <span
        class="stat-row__value"
        :class="valueClass"
      >{{ value }}</span>
    </button>
  </UTooltip>
</template>

<style scoped>
/* Matches the panel's .bp-row look, as a focusable button */
.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  width: 100%;
  font-size: 0.65rem;
  padding: 0;
  background: none;
  border: none;
  cursor: help;
  font-family: inherit;
  text-align: left;
  border-radius: 3px;
}

.stat-row:focus-visible {
  outline: 2px solid var(--vp-gold-bright);
  outline-offset: 1px;
}

.stat-row__label {
  color: var(--vp-muted);
}

.stat-row__value {
  color: #aab0d8;
  font-weight: 600;
}

.stat-row__value.bp-value--good { color: var(--vp-win); }
.stat-row__value.bp-value--neutral { color: #fbbf24; }
.stat-row__value.bp-value--bad { color: var(--vp-loss); }
</style>
