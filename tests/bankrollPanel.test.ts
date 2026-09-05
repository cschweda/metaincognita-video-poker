// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import BankrollPanel from '../app/components/BankrollPanel.vue'
import { useGameStore } from '../app/stores/game'

// Nuxt auto-imports these into components; the test supplies them.
beforeEach(() => {
  const g = globalThis as Record<string, unknown>
  g.computed = computed
  g.ref = ref
  g.onMounted = onMounted
  g.onUnmounted = onUnmounted
  g.watch = watch
  g.useGameStore = useGameStore
  setActivePinia(createPinia())
})

const stubs = {
  StatRow: { props: ['label', 'value'], template: '<div class="stat-row">{{ label }}: {{ value }}</div>' },
  BankrollSparkline: true,
  RulesModal: true,
  UModal: true,
  UButton: true
}

/** Put the store in the result phase with a given payout, then render. */
function panelAfterHand(payoutCoins: number) {
  const game = useGameStore()
  game.phase = 'result'
  game.resultPayout = payoutCoins
  game.resultHandName = payoutCoins > 0 ? 'Three of a Kind' : null
  game.stats.handsPlayed = 1
  game.stats.totalWagered = game.coinsBet
  game.stats.totalReturned = payoutCoins
  return mount(BankrollPanel, { global: { stubs } })
}

describe('BankrollPanel — LAST HAND result', () => {
  it('shows a push as net zero, not as a gain', () => {
    // Deuces Wild three of a kind pays 1:1 — five coins back on a five-coin
    // bet. The banner and the session Net both call that +$0.00; this panel
    // used to call it +$1.25 in the win color.
    const text = panelAfterHand(5).get('[data-test="last-hand-net"]').text()
    expect(text).toBe('+$0.00')
  })

  it('shows a real win as its net gain', () => {
    // Full house at 15 coins: +10 coins net = +$2.50 at $0.25
    expect(panelAfterHand(15).get('[data-test="last-hand-net"]').text()).toBe('+$2.50')
  })

  it('shows a loss as the wager lost', () => {
    expect(panelAfterHand(0).get('[data-test="last-hand-net"]').text()).toBe('-$1.25')
  })
})
