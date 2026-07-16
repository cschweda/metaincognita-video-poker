import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

// The two statistical suites dominate the runtime (~100s: 50k-shuffle
// chi-squared runs and the 60k-hand-per-variant strategy tripwire). They run
// in the `statistical` project; everything else is the `fast` project for a
// sub-5s dev loop via `pnpm test:fast`. `pnpm test` still runs both.
const STATISTICAL_SUITES = ['tests/shuffle.test.ts', 'tests/strategyLookup.test.ts']

const shared = {
  // Compiles the SFCs the component tests mount. The default environment stays
  // `node` — the logic tests are the bulk of the suite and do not need a DOM;
  // the few component tests opt in with a `@vitest-environment happy-dom` docblock.
  plugins: [vue()],
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url))
    }
  }
}

export default defineConfig({
  ...shared,
  test: {
    // The statistical shuffle tests run 50k shuffles each — well over the
    // 5s default on slower CI runners
    testTimeout: 60_000,
    coverage: {
      include: ['app/**/*.{ts,vue}']
    },
    projects: [
      {
        ...shared,
        test: {
          name: 'fast',
          include: ['tests/**/*.test.ts'],
          exclude: STATISTICAL_SUITES,
          testTimeout: 60_000
        }
      },
      {
        ...shared,
        test: {
          name: 'statistical',
          include: STATISTICAL_SUITES,
          testTimeout: 300_000
        }
      }
    ]
  }
})
