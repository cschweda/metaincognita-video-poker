// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppHubLink from '../app/components/AppHubLink.vue'

// UIcon is a Nuxt UI global. NuxtLink/RouterLink are registered so that a
// "helpful" refactor of the hub exit into a router link would be caught here
// rather than silently shipping a control that never leaves the SPA.
const stubs = {
  UIcon: true,
  NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
  RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' }
}

function hubLink() {
  return mount(AppHubLink, { global: { stubs } })
}

describe('AppHubLink', () => {
  it('points at the hub with an absolute URL', () => {
    // Absolute, so it resolves the same from videopoker.metaincognita.com and
    // from local dev.
    const a = hubLink().get('[data-test="hub-link"]')
    expect(a.attributes('href')).toBe('https://metaincognita.com')
  })

  it('is a real anchor, not a router link — it leaves the SPA', () => {
    const wrapper = hubLink()
    const a = wrapper.get('[data-test="hub-link"]')
    expect(a.element.tagName).toBe('A')
    expect(a.attributes('to')).toBeUndefined()
    expect(wrapper.findComponent({ name: 'NuxtLink' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'RouterLink' }).exists()).toBe(false)
  })

  it('exits in the same tab', () => {
    // A new tab would leave the simulator running behind it — this is an exit,
    // not a side trip.
    const a = hubLink().get('[data-test="hub-link"]')
    expect(a.attributes('target')).toBeUndefined()
  })

  it('accessible name contains the visible wordmark (WCAG 2.5.3 Label in Name)', () => {
    const a = hubLink().get('[data-test="hub-link"]')
    const visible = a.text().trim()
    expect(visible).toBe('METAINCOGNITA')
    // "Meta Incognita — exit the simulator" reads fine to a human and still
    // fails 2.5.3, on the space. The accessible name must contain the label.
    expect(a.attributes('aria-label')).toContain(visible)
  })

  it('stays gold — suite chrome, not this app\'s accent token', () => {
    // The accent here happens to be amber, but the hub exit must not follow
    // `primary`: it looks the same in every game so players learn it once.
    const classes = hubLink().get('[data-test="hub-link"]').classes()
    expect(classes).toContain('text-amber-400')
    expect(classes.some(c => c.includes('primary'))).toBe(false)
  })
})
