// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    // Reference artifacts, not source code
    ignores: ['docs/**']
  }
)
