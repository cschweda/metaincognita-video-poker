// @vitest-environment happy-dom
import { describe, it, expect, beforeAll } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import HoldOptionsTable from '../app/components/HoldOptionsTable.vue'
import type { HoldAnalysis } from '../app/utils/evCalculator'

// Nuxt auto-imports `computed` into components; the test provides it.
beforeAll(() => {
  (globalThis as Record<string, unknown>).computed = computed
})

function option(heldIndices: number[], expectedValue: number): HoldAnalysis {
  return { heldIndices, heldCards: [], expectedValue, handDistribution: {} }
}

const options = [option([0, 1], 1.5), option([0], 0.8), option([], 0.36)]

describe('HoldOptionsTable', () => {
  it('renders every option when no limit is given', () => {
    const wrapper = mount(HoldOptionsTable, { props: { options } })
    expect(wrapper.findAll('.hot-row')).toHaveLength(3)
  })

  it('renders no rows when the limit is 0 — zero is a limit, not "no limit"', () => {
    const wrapper = mount(HoldOptionsTable, { props: { options, limit: 0 } })
    expect(wrapper.findAll('.hot-row')).toHaveLength(0)
  })

  it('labels the delta column as the caller asks', () => {
    const wrapper = mount(HoldOptionsTable, { props: { options, deltaLabel: 'Δ Best' } })
    expect(wrapper.get('.hot-header .hot-delta').text()).toBe('Δ Best')
  })
})
