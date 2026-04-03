<script setup lang="ts">
const store = useAnalysisStore()
</script>

<template>
  <NuxtLink
    v-if="store.status !== 'idle'"
    to="/analysis"
    class="inline-flex items-center gap-1.5 text-xs transition-colors"
    :class="store.status === 'running' ? 'text-amber-400 hover:text-amber-300' : 'text-green-400 hover:text-green-300'"
  >
    <span
      class="w-2 h-2 rounded-full"
      :class="{
        'bg-amber-400 animate-pulse': store.status === 'running',
        'bg-green-400': store.status === 'done',
      }"
    />
    <span v-if="store.status === 'running'">
      Analysis {{ store.runProgress }}%
    </span>
    <span v-else>
      Analysis Ready
    </span>
  </NuxtLink>
</template>
