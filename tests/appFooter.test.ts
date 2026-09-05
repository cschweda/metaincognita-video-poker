// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import AppFooter from '../app/components/AppFooter.vue'

// Nuxt auto-imports useRoute/computed; AnalysisStatus reads the analysis
// store. The test supplies the route and stubs the rest.
function footerOn(path: string) {
  const g = globalThis as Record<string, unknown>
  g.computed = computed
  g.useRoute = () => ({ path })
  return mount(AppFooter, {
    global: {
      stubs: {
        UIcon: true,
        AnalysisStatus: { template: '<span data-test="analysis-status" />' },
        NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' }
      }
    }
  })
}

function linkTexts(wrapper: ReturnType<typeof mount>): string[] {
  return wrapper.findAll('a[href^="/"]').map(a => a.text())
}

describe('AppFooter', () => {
  it('calls the setup page "Home", like every other control that points at it', () => {
    const texts = linkTexts(footerOn('/game'))
    expect(texts).toContain('Home')
    expect(texts).not.toContain('Setup')
  })

  it('omits the current page\'s own link', () => {
    expect(linkTexts(footerOn('/game'))).not.toContain('Game')
    expect(linkTexts(footerOn('/'))).not.toContain('Home')
    expect(linkTexts(footerOn('/history'))).toEqual(['Home', 'Game', 'Analysis'])
  })

  it('leaves the analysis status off the analysis page, which reports its own run', () => {
    expect(footerOn('/analysis').find('[data-test="analysis-status"]').exists()).toBe(false)
    expect(footerOn('/game').find('[data-test="analysis-status"]').exists()).toBe(true)
  })
})
