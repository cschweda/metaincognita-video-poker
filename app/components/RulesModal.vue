<script setup lang="ts">
import { VARIANT_RULES } from '~/utils/variantRules'

const props = defineProps<{
  variant: string
}>()

const open = defineModel<boolean>('open', { default: false })

const rules = computed(() => VARIANT_RULES[props.variant])
</script>

<template>
  <UModal v-model:open="open" :title="rules?.variant + ' — Rules & Strategy'" close-icon="i-lucide-x">
    <template #body>
      <div v-if="rules" class="rules-body">
        <!-- Overview -->
        <section class="rules-section">
          <h3 class="rules-heading">Overview</h3>
          <p class="rules-text">{{ rules.overview }}</p>
        </section>

        <!-- Quick facts -->
        <section class="rules-section">
          <h3 class="rules-heading">Quick Facts</h3>
          <div class="rules-facts">
            <div class="rules-fact">
              <span class="rules-fact__label">Deck</span>
              <span class="rules-fact__value">{{ rules.deckSize }} cards</span>
            </div>
            <div class="rules-fact">
              <span class="rules-fact__label">Wild Cards</span>
              <span class="rules-fact__value">{{ rules.wildCards }}</span>
            </div>
            <div class="rules-fact">
              <span class="rules-fact__label">Min. Paying Hand</span>
              <span class="rules-fact__value">{{ rules.minPayingHand }}</span>
            </div>
          </div>
        </section>

        <!-- Hand rankings -->
        <section class="rules-section">
          <h3 class="rules-heading">Hand Rankings (highest to lowest)</h3>
          <ol class="rules-rankings">
            <li v-for="(hand, i) in rules.handRankings" :key="i" class="rules-ranking">
              {{ hand }}
            </li>
          </ol>
        </section>

        <!-- Strategy notes -->
        <section class="rules-section">
          <h3 class="rules-heading">Strategy Notes</h3>
          <ul class="rules-strategy">
            <li v-for="(note, i) in rules.strategyNotes" :key="i" class="rules-strategy-item">
              {{ note }}
            </li>
          </ul>
        </section>

        <!-- How this differs from other variants -->
        <section v-if="rules.strategyDifferences?.length" class="rules-section rules-section--diff">
          <h3 class="rules-heading">How Strategy Differs from Other Variants</h3>
          <ul class="rules-strategy">
            <li v-for="(diff, i) in rules.strategyDifferences" :key="i" class="rules-strategy-item rules-strategy-item--diff">
              {{ diff }}
            </li>
          </ul>
        </section>

        <!-- Strategy complexity -->
        <section v-if="rules.strategyComplexity" class="rules-section">
          <h3 class="rules-heading">Strategy Complexity</h3>
          <p class="rules-text">{{ rules.strategyComplexity }}</p>
        </section>

        <!-- Pay table tip -->
        <section class="rules-section rules-section--tip">
          <h3 class="rules-heading">Pay Table Tip</h3>
          <p class="rules-text">{{ rules.payTableTip }}</p>
        </section>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.rules-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 4px 0;
  font-family: system-ui, -apple-system, sans-serif;
  color: #e0e0ee;
  font-size: 0.85rem;
  line-height: 1.6;
}

.rules-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rules-heading {
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #8b9cf7;
  margin: 0;
}

.rules-text {
  margin: 0;
  color: #c8c8da;
}

.rules-facts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.rules-fact {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 8px 10px;
  text-align: center;
}

.rules-fact__label {
  display: block;
  font-size: 0.62rem;
  color: #8890b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.rules-fact__value {
  display: block;
  font-family: 'Fira Code', monospace;
  font-weight: 700;
  font-size: 0.85rem;
  color: #ffffff;
  margin-top: 2px;
}

.rules-rankings {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.rules-ranking {
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  color: #d0d0e0;
}

.rules-strategy {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rules-strategy-item {
  color: #c8c8da;
  font-size: 0.82rem;
}

.rules-section--diff {
  background: rgba(99, 102, 241, 0.06);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 8px;
  padding: 12px 14px;
}

.rules-section--diff .rules-heading {
  color: #818cf8;
}

.rules-strategy-item--diff {
  color: #c4b5fd !important;
  font-size: 0.8rem;
}

.rules-section--tip {
  background: rgba(201, 162, 39, 0.08);
  border: 1px solid rgba(201, 162, 39, 0.2);
  border-radius: 8px;
  padding: 12px 14px;
}

.rules-section--tip .rules-heading {
  color: #fbbf24;
}

.rules-section--tip .rules-text {
  color: #e0d0a0;
}
</style>
