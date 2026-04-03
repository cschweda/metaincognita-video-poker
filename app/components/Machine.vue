<script setup lang="ts">
const game = useGameStore()
</script>

<template>
  <div class="machine">
    <PayTableDisplay />
    <CardHand />
    <ResultDisplay />
    <ControlBar />
  </div>
</template>

<style scoped>
.machine {
  max-width: 740px;
  width: 100%;
  background: linear-gradient(180deg, #1e1e3a 0%, #1a1a2e 8%, #151528 100%);
  border: 2px solid #28284a;
  border-radius: 14px;
  box-shadow:
    0 0 0 1px #c9a227,
    0 12px 48px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  padding: clamp(10px, 2.5vw, 22px);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
