<script setup lang="ts">
// The one footer. Previously copy-pasted into all four pages with an inline
// octocat SVG each — and they had already drifted (analysis.vue's copy lost
// AnalysisStatus). Keep nav, status, and the GitHub link here only.
</script>

<template>
  <footer class="border-t border-gray-800 pt-4 mt-10 flex items-center justify-center gap-4 text-xs text-gray-400">
    <NuxtLink
      to="/"
      class="hover:text-gray-300 transition-colors"
    >Setup</NuxtLink>
    <span aria-hidden="true">&middot;</span>
    <NuxtLink
      to="/game"
      class="hover:text-gray-300 transition-colors"
    >Game</NuxtLink>
    <span aria-hidden="true">&middot;</span>
    <NuxtLink
      to="/analysis"
      class="hover:text-gray-300 transition-colors"
    >Analysis</NuxtLink>
    <span aria-hidden="true">&middot;</span>
    <NuxtLink
      to="/history"
      class="hover:text-gray-300 transition-colors"
    >History</NuxtLink>
    <AnalysisStatus />
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
