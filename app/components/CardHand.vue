<script setup lang="ts">
const game = useGameStore()

function onKeyDown(e: KeyboardEvent) {
  if (!game.canHold) return

  const target = e.target as HTMLElement
  const container = target.closest('.card-hand')
  if (!container) return

  const cards = Array.from(container.querySelectorAll<HTMLElement>('.card'))
  const idx = cards.indexOf(target)
  if (idx === -1) return

  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault()
    cards[(idx + 1) % 5]?.focus()
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault()
    cards[(idx + 4) % 5]?.focus()
  }
}
</script>

<template>
  <div
    class="card-hand"
    role="group"
    aria-label="Your hand — 5 cards"
    @keydown="onKeyDown"
  >
    <SingleCard
      v-for="(card, i) in game.hand"
      :key="card ? `${card.id}-${i}` : `empty-${i}`"
      :card="card"
      :is-held="game.held[i]"
      :is-dimmed="game.canHold && game.anyHeld && !game.held[i]"
      :is-face-down="game.faceDown[i]"
      :can-hold="game.canHold"
      @toggle-hold="game.toggleHold(i)"
    />
  </div>
</template>

<style scoped>
.card-hand {
  display: flex;
  justify-content: center;
  gap: clamp(3px, 0.9vw, 8px);
  padding: 2px 0;
}
</style>
