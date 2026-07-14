// @vitest-environment happy-dom
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DefaultLayout from '../app/layouts/default.vue'
import AppHubLink from '../app/components/AppHubLink.vue'

// Not `import.meta.url` — under the happy-dom environment that is an http URL,
// not a file one. Vitest runs from the project root.
const appDir = resolve(process.cwd(), 'app')

// The real AppHubLink is mounted, not a stub — this asserts the actual control
// a player gets. Nuxt auto-imports it in the app; plain Vitest needs it named.
const mountOptions = {
  global: {
    components: { AppHubLink },
    stubs: { UIcon: true }
  }
}

// `useRoute` is a Nuxt auto-import, so it is a free identifier in the SFC; a
// global read resolves it. The layout does not consult the route today, and
// stubbing it is what makes this a real guard: if someone ever gates the hub
// exit behind `v-if="useRoute().path !== '/'"`, these cases go red instead of
// throwing on an undefined global.
function mountAt(path: string) {
  vi.stubGlobal('useRoute', () => ({ path }))
  return mount(DefaultLayout, mountOptions)
}

describe('default layout', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // The whole point of the feature: there is no route you can get stranded on.
  it.each([
    ['the index', '/'],
    ['the game', '/game'],
    ['the analysis page', '/analysis'],
    ['the history page', '/history']
  ])('shows the hub exit on %s', (_where, path) => {
    const a = mountAt(path).get('[data-test="hub-link"]')
    expect(a.element.tagName).toBe('A')
    expect(a.attributes('href')).toBe('https://metaincognita.com')
    expect(a.attributes('target')).toBeUndefined()
  })

  it('pins the hub exit to the far left of the status bar', () => {
    // Prominence is the point — it is the first thing in the bar, ahead of the
    // app's own wordmark.
    const bar = mountAt('/').get('nav')
    expect(bar.element.querySelector('[data-test="hub-link"]')).toBe(bar.element.firstElementChild)
  })

  // Guards the two ways a route could still lose the exit: the page could opt
  // out of the layout, or app.vue could stop applying layouts at all.
  it('applies the layout to every route — app.vue wraps the page in NuxtLayout', () => {
    expect(readFileSync(`${appDir}/app.vue`, 'utf8')).toContain('<NuxtLayout>')
  })

  it('has no page opting out of the default layout', () => {
    const pages = readdirSync(`${appDir}/pages`).filter(f => f.endsWith('.vue'))
    expect(pages.length).toBeGreaterThan(0)

    for (const page of pages) {
      const meta = readFileSync(`${appDir}/pages/${page}`, 'utf8').match(/definePageMeta\(([\s\S]*?)\)/)
      expect(meta?.[1] ?? '', `${page} must not override the default layout`).not.toMatch(/\blayout\b/)
    }
  })
})
