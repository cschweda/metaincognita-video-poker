<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

useSeoMeta({
  title: 'Video Poker Trainer',
  description: 'A video poker training simulator that teaches optimal play, pay table literacy, and bankroll management.',
  ogTitle: 'Video Poker Trainer',
  ogDescription: 'Learn to play video poker with mathematically optimal strategy.'
})
</script>

<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>
