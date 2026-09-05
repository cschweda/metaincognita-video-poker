<script setup lang="ts">
// The one footer. Previously copy-pasted into all four pages with an inline
// octocat SVG each — and they had already drifted. Keep nav, status, and the
// GitHub link here only. Per docs/design-system.md a page omits its own
// link, and the analysis page reports its own run, so it carries no
// AnalysisStatus.
const route = useRoute()

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/game', label: 'Game' },
  { to: '/analysis', label: 'Analysis' },
  { to: '/history', label: 'History' }
]

const links = computed(() => NAV.filter(link => link.to !== route.path))
const showAnalysisStatus = computed(() => route.path !== '/analysis')
</script>

<template>
  <footer class="border-t border-gray-800 pt-4 mt-10 flex items-center justify-center gap-4 text-xs text-gray-400">
    <template
      v-for="(link, i) in links"
      :key="link.to"
    >
      <span
        v-if="i > 0"
        aria-hidden="true"
      >&middot;</span>
      <NuxtLink
        :to="link.to"
        class="hover:text-gray-300 transition-colors"
      >{{ link.label }}</NuxtLink>
    </template>
    <AnalysisStatus v-if="showAnalysisStatus" />
    <span aria-hidden="true">&middot;</span>
    <a
      href="https://github.com/cschweda/metaincognita-video-poker"
      target="_blank"
      rel="noopener"
      class="hover:text-gray-300 transition-colors flex items-center gap-1"
    >
      <UIcon
        name="i-simple-icons-github"
        class="w-3.5 h-3.5"
      />
      GitHub
    </a>
  </footer>
</template>
