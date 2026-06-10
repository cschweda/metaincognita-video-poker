import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url))
    }
  },
  test: {
    include: ['tests/**/*.test.ts'],
    // The statistical shuffle tests run 50k shuffles each — well over the
    // 5s default on slower CI runners
    testTimeout: 60_000
  }
})
