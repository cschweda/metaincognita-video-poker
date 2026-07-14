import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Compiles the SFCs the component tests mount. The default environment stays
  // `node` — the logic tests are the bulk of the suite and do not need a DOM;
  // the few component tests opt in with a `@vitest-environment happy-dom` docblock.
  plugins: [vue()],
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
