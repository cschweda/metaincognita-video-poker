<script setup lang="ts">
import type { Card } from '~/utils/cards'
import { RANK_LABELS, SUIT_SYMBOLS, SUIT_COLORS, RANK_NAMES, SUIT_NAMES } from '~/utils/cards'

const props = defineProps<{
  card: Card | null
  isHeld: boolean
  isDimmed: boolean
  isFaceDown: boolean
  canHold: boolean
}>()

const emit = defineEmits<{
  toggleHold: []
}>()

const suitColor = computed(() =>
  props.card ? SUIT_COLORS[props.card.suit] : '#666'
)

const ariaLabel = computed(() => {
  if (!props.card) return 'Empty card slot'
  const name = `${RANK_NAMES[props.card.rank]} of ${SUIT_NAMES[props.card.suit]}`
  return props.isHeld ? `${name}, held` : name
})
</script>

<template>
  <div class="card-slot">
    <!-- HELD badge -->
    <div class="held-badge-area">
      <Transition name="held-pop">
        <span v-if="isHeld" class="held-badge">HELD</span>
      </Transition>
    </div>

    <!-- Card face — clickable toggle -->
    <button
      class="card"
      :class="{
        'card--held': isHeld,
        'card--dimmed': isDimmed,
      }"
      :aria-pressed="isHeld"
      :aria-label="ariaLabel"
      :disabled="!canHold"
      @click="emit('toggleHold')"
    >
      <div class="card__inner" :class="{ 'card__inner--flipped': isFaceDown }">
        <!-- Front face -->
        <div class="card__front">
          <template v-if="card">
            <div class="card__corner card__corner--top">
              <span class="card__rank" :style="{ color: suitColor }">{{ RANK_LABELS[card.rank] }}</span>
              <span class="card__suit-small" :style="{ color: suitColor }">{{ SUIT_SYMBOLS[card.suit] }}</span>
            </div>
            <div class="card__center" :style="{ color: suitColor }">
              {{ SUIT_SYMBOLS[card.suit] }}
            </div>
            <div class="card__corner card__corner--bottom">
              <span class="card__rank" :style="{ color: suitColor }">{{ RANK_LABELS[card.rank] }}</span>
              <span class="card__suit-small" :style="{ color: suitColor }">{{ SUIT_SYMBOLS[card.suit] }}</span>
            </div>
          </template>
        </div>

        <!-- Back face -->
        <div class="card__back">
          <div class="card__back-pattern" />
          <div class="card__back-border-outer" />
          <div class="card__back-border-inner" />
          <div class="card__back-diamond" />
        </div>
      </div>
    </button>

    <!-- HOLD / CANCEL button -->
    <button
      class="hold-btn"
      :class="{
        'hold-btn--active': isHeld,
        'hold-btn--disabled': !canHold,
      }"
      :disabled="!canHold"
      :aria-pressed="isHeld"
      :aria-label="card ? `${isHeld ? 'Cancel' : 'Hold'} ${RANK_LABELS[card.rank]} of ${card.suit}` : 'Hold'"
      @click="emit('toggleHold')"
    >
      {{ isHeld ? 'CANCEL' : 'HOLD' }}
    </button>
  </div>
</template>

<style scoped>
.card-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.held-badge-area {
  height: 22px;
  display: flex;
  align-items: center;
  margin-bottom: 3px;
}

.held-badge {
  background: linear-gradient(135deg, #c9a227, #ffd60a);
  color: #1a1a2e;
  font-size: 0.58rem;
  font-weight: 800;
  padding: 2px 10px;
  border-radius: 4px;
  letter-spacing: 0.12em;
  box-shadow: 0 0 10px rgba(201, 162, 39, 0.5);
  font-family: 'Fira Code', monospace;
}

.held-pop-enter-active {
  animation: heldPopIn 0.15s ease-out;
}
.held-pop-leave-active {
  animation: heldPopIn 0.1s ease-in reverse;
}
@keyframes heldPopIn {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* Card button reset */
.card {
  all: unset;
  width: clamp(58px, 12vw, 110px);
  height: clamp(81px, 16.8vw, 154px);
  border-radius: 8px;
  position: relative;
  perspective: 600px;
  cursor: pointer;
  transform: translateY(0);
  transition: transform 0.15s ease;
}

.card:disabled {
  cursor: default;
}

.card:focus-visible {
  outline: 2px solid #ffd60a;
  outline-offset: 2px;
}

.card--held {
  transform: translateY(-10px);
}

.card--dimmed {
  opacity: 0.5;
  transition: opacity 0.15s ease;
}

/* Card inner — 3D flip container */
.card__inner {
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.4s ease;
}

.card__inner--flipped {
  transform: rotateY(180deg);
}

.card__front,
.card__back {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 8px;
}

/* Front face */
.card__front {
  background: #fff;
  border: 1px solid #c8c8d4;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: clamp(3px, 0.7vw, 7px);
  overflow: hidden;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.card--held .card__front {
  border: 2.5px solid #c9a227;
  box-shadow: 0 0 18px rgba(201, 162, 39, 0.5), 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* Corner rank + suit */
.card__corner {
  line-height: 1;
}

.card__corner--bottom {
  text-align: right;
  transform: rotate(180deg);
}

.card__rank {
  display: block;
  font-size: clamp(0.85rem, 2.1vw, 1.35rem);
  font-weight: 700;
  font-family: 'Fira Code', monospace;
}

.card__suit-small {
  display: block;
  font-size: clamp(0.55rem, 1.4vw, 0.85rem);
  margin-top: 1px;
}

/* Center suit */
.card__center {
  font-size: clamp(1.4rem, 4vw, 2.6rem);
  text-align: center;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Back face — burgundy with gold inlay */
.card__back {
  transform: rotateY(180deg);
  background: linear-gradient(135deg, #6b1020 0%, #4a0a18 50%, #6b1020 100%);
  border: 2px solid #c9a227;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), inset 0 0 30px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.card__back-pattern {
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(
      45deg,
      transparent 0px, transparent 5px,
      rgba(201, 162, 39, 0.06) 5px, rgba(201, 162, 39, 0.06) 6px
    ),
    repeating-linear-gradient(
      -45deg,
      transparent 0px, transparent 5px,
      rgba(201, 162, 39, 0.06) 5px, rgba(201, 162, 39, 0.06) 6px
    );
}

.card__back-border-outer {
  position: absolute;
  inset: 4px;
  border: 1.5px solid rgba(201, 162, 39, 0.5);
  border-radius: 5px;
}

.card__back-border-inner {
  position: absolute;
  inset: 8px;
  border: 1px solid rgba(201, 162, 39, 0.25);
  border-radius: 4px;
}

.card__back-diamond {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(45deg);
  width: clamp(13px, 2.8vw, 22px);
  height: clamp(13px, 2.8vw, 22px);
  border: 1.5px solid rgba(201, 162, 39, 0.6);
  background: rgba(201, 162, 39, 0.1);
}

/* HOLD / CANCEL button — big casino style */
.hold-btn {
  margin-top: 8px;
  width: clamp(58px, 12vw, 110px);
  padding: clamp(8px, 1.2vw, 12px) 0;
  border-radius: 8px;
  border: 2px solid #4a4a6e;
  background: linear-gradient(180deg, #e0e0ff 0%, #b0b0d0 40%, #8888b0 100%);
  color: #1a1a2e;
  font-size: clamp(0.6rem, 1.2vw, 0.8rem);
  font-weight: 800;
  font-family: 'Fira Code', monospace;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  cursor: pointer;
  box-shadow:
    0 4px 0 #3a3a5e,
    0 6px 12px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  transition: transform 0.08s, box-shadow 0.08s, background 0.15s, border-color 0.15s;
}

.hold-btn:hover:not(:disabled) {
  background: linear-gradient(180deg, #f0f0ff 0%, #c0c0e0 40%, #9898c0 100%);
  border-color: #6a6a8e;
}

.hold-btn:active:not(:disabled) {
  transform: translateY(3px);
  box-shadow:
    0 1px 0 #3a3a5e,
    0 2px 4px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.hold-btn--active {
  background: linear-gradient(180deg, #ffd60a 0%, #c9a227 40%, #a88520 100%);
  border-color: #c9a227;
  color: #1a1a2e;
  box-shadow:
    0 4px 0 #6b5510,
    0 0 14px rgba(201, 162, 39, 0.4),
    0 6px 12px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.hold-btn--active:hover:not(:disabled) {
  background: linear-gradient(180deg, #ffe44a 0%, #d4b030 40%, #b89525 100%);
}

.hold-btn--disabled {
  opacity: 0.3;
  cursor: default;
  box-shadow:
    0 2px 0 #2a2a3e,
    0 3px 6px rgba(0, 0, 0, 0.2);
}

.hold-btn:focus-visible {
  outline: 2px solid #ffd60a;
  outline-offset: 2px;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .card,
  .card__inner,
  .card__front {
    transition-duration: 0.01ms !important;
  }
  .held-pop-enter-active,
  .held-pop-leave-active {
    animation-duration: 0.01ms !important;
  }
}
</style>
