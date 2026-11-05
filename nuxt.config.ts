// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@pinia/nuxt'
  ],

  ssr: false,

  devtools: {
    enabled: true
  },

  // Title/description/social meta live here (single source). With ssr: false
  // only app.head reaches the generated HTML — useSeoMeta in app.vue runs
  // client-side, so link-preview crawlers never saw it.
  app: {
    head: {
      title: 'Video Poker Trainer',
      meta: [
        { name: 'description', content: 'A video poker training simulator that teaches optimal play, pay table literacy, and bankroll management.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://videopoker.metaincognita.com/' },
        { property: 'og:title', content: 'Video Poker Trainer' },
        { property: 'og:description', content: 'Exhaustive EV analysis of all 32 holds on every hand, mistake cost tracking in dollars, and pay-table literacy across Jacks or Better, Bonus Poker, Double Bonus and Deuces Wild.' },
        { property: 'og:image', content: 'https://videopoker.metaincognita.com/og-image.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: 'Video Poker Trainer: a 9/6 Jacks or Better hand A-Q-J-10-9 with the four clubs held, beside the exact expected value of the top holds.' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Video Poker Trainer' },
        { name: 'twitter:description', content: 'Exhaustive EV analysis of all 32 holds on every hand, mistake cost tracking in dollars, and pay-table literacy across Jacks or Better, Bonus Poker, Double Bonus and Deuces Wild.' },
        { name: 'twitter:image', content: 'https://videopoker.metaincognita.com/og-image.png' },
        { name: 'twitter:image:alt', content: 'Video Poker Trainer: a 9/6 Jacks or Better hand A-Q-J-10-9 with the four clubs held, beside the exact expected value of the top holds.' }
      ]
    }
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/': { prerender: true }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  // ssr: false makes @nuxt/icon default to the runtime iconify API; scanning
  // the source for the icons actually used bundles them instead, so the
  // footer's GitHub glyph (and the Lucide UI icons) render offline and under
  // a stricter CSP.
  icon: {
    clientBundle: {
      scan: true,
      sizeLimitKb: 256
    }
  }
})
