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

  // Title/description/social meta live in app.vue's useSeoMeta (single source)

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
