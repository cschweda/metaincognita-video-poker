import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAnalysisStore } from '../app/stores/analysis'

// The node environment has no Worker — the same situation as a webview
// without Web Workers or a CSP that blocks them.

describe('analysis store — no Web Worker available', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('stays idle and says why the simulation cannot run', () => {
    const store = useAnalysisStore()
    expect(typeof Worker).toBe('undefined')

    store.startAnalysis()

    expect(store.status).toBe('idle')
    expect(store.unavailableReason).toMatch(/Web Worker/i)
    expect(store.results).toEqual([])
  })
})
