import { defineStore } from 'pinia'
import type { Card } from '~/utils/cards'
import { createDeck, shuffle } from '~/utils/cards'
import { classifyHand, classifyBonusHand, classifyDDBHand } from '~/utils/handClassifier'
import { classifyDeucesWild } from '~/utils/wildClassifier'
import { PAY_TABLES, getPayForHand } from '~/utils/payTables'
import type { PayTableDef } from '~/utils/payTables'
import { analyzeHand } from '~/utils/evCalculator'
import type { HoldAnalysis } from '~/utils/evCalculator'
import { replayHandsThroughPersona, PERSONAS } from '~/utils/botPersonas'
import type { PersonaResult } from '~/utils/botPersonas'

export type GamePhase = 'idle' | 'dealing' | 'dealt' | 'drawing' | 'result'

export interface HandHistoryEntry {
  handNumber: number
  dealtCards: Card[]
  finalCards: Card[]
  playerHeld: number[]
  optimalHeld: number[]
  playerEV: number
  optimalEV: number
  mistakeCost: number
  handResult: string | null
  payout: number
}

export interface SessionStats {
  handsPlayed: number
  handsWon: number
  totalWagered: number
  totalReturned: number
  totalMistakes: number
  totalEVLost: number
}

export const useGameStore = defineStore('game', () => {
  // --- Configuration ---
  const payTableId = ref<string>('job-9-6')
  const denomination = ref<number>(0.25)
  const coinsBet = ref<number>(5)

  // --- Game state ---
  const phase = ref<GamePhase>('idle')
  const credits = ref<number>(100)
  const hand = ref<(Card | null)[]>([null, null, null, null, null])
  const held = ref<boolean[]>([false, false, false, false, false])
  const faceDown = ref<boolean[]>([true, true, true, true, true])
  const deck = ref<Card[]>([])

  // --- Result ---
  const resultHandName = ref<string | null>(null)
  const resultPayout = ref<number>(0)
  const winningRowIndex = ref<number>(-1)

  // --- EV Analysis (Phase 2) ---
  const allHoldOptions = ref<HoldAnalysis[]>([])
  const optimalPlay = ref<HoldAnalysis | null>(null)
  const playerAnalysis = ref<HoldAnalysis | null>(null)
  const lastMistakeCost = ref<number>(0)
  const wasOptimal = ref<boolean>(true)

  // --- Hand history ---
  const handHistory = ref<HandHistoryEntry[]>([])

  // --- Dealt decks for persona replay ---
  const dealtDecks = ref<{ cards: Card[], remaining: Card[] }[]>([])

  // --- Session timing ---
  const sessionStartTime = ref<number>(Date.now())

  // --- Persona comparison results ---
  const personaResults = ref<PersonaResult[]>([])
  const sessionEnded = ref<boolean>(false)

  // --- Session stats ---
  const stats = ref<SessionStats>({
    handsPlayed: 0,
    handsWon: 0,
    totalWagered: 0,
    totalReturned: 0,
    totalMistakes: 0,
    totalEVLost: 0
  })

  // --- Computed ---
  const payTable = computed<PayTableDef>(() => PAY_TABLES[payTableId.value]!)

  const canBet = computed(() => phase.value === 'idle' || phase.value === 'result')
  const canHold = computed(() => phase.value === 'dealt')
  const canDeal = computed(() => canBet.value && credits.value >= coinsBet.value)
  const canDraw = computed(() => phase.value === 'dealt')
  const anyHeld = computed(() => held.value.some(h => h))

  const creditsAsDollars = computed(() => (credits.value * denomination.value).toFixed(2))
  const betAsDollars = computed(() => (coinsBet.value * denomination.value).toFixed(2))

  const effectiveReturn = computed(() => {
    if (stats.value.totalWagered === 0) return 0
    return (stats.value.totalReturned / stats.value.totalWagered) * 100
  })

  const sessionElapsedMinutes = computed(() => {
    return Math.round((Date.now() - sessionStartTime.value) / 60000)
  })

  const handsPerHour = computed(() => {
    const minutes = (Date.now() - sessionStartTime.value) / 60000
    if (minutes < 0.5) return 0
    return Math.round(stats.value.handsPlayed / minutes * 60)
  })

  const effectiveHourlyRate = computed(() => {
    const minutes = (Date.now() - sessionStartTime.value) / 60000
    if (minutes < 0.5) return 0
    const netCredits = stats.value.totalReturned - stats.value.totalWagered
    const netDollars = netCredits * denomination.value
    return (netDollars / minutes) * 60
  })

  // Live analysis: matches current hold selection against the precomputed 32 options
  const currentHoldAnalysis = computed<HoldAnalysis | null>(() => {
    if (phase.value !== 'dealt' || allHoldOptions.value.length === 0) return null
    const heldIndices = held.value
      .map((h, i) => h ? i : -1)
      .filter(i => i >= 0)
    return allHoldOptions.value.find(opt =>
      opt.heldIndices.length === heldIndices.length
      && opt.heldIndices.every(idx => heldIndices.includes(idx))
    ) ?? null
  })

  // --- Actions ---

  function setPayTable(id: string) {
    if (!canBet.value) return
    if (!PAY_TABLES[id]) return
    payTableId.value = id
    resetGame()
  }

  function setCoinsBet(coins: number) {
    if (!canBet.value) return
    coinsBet.value = Math.max(1, Math.min(5, coins))
  }

  function incrementBet() {
    if (!canBet.value) return
    coinsBet.value = coinsBet.value >= 5 ? 1 : coinsBet.value + 1
  }

  function betMax() {
    if (!canBet.value) return
    coinsBet.value = 5
    // Like a real machine: BET MAX also deals immediately
    deal()
  }

  function toggleHold(index: number) {
    if (!canHold.value) return
    if (index < 0 || index > 4) return
    const updated = [...held.value]
    updated[index] = !updated[index]
    held.value = updated
  }

  function classifyCurrentHand(cards: Card[]): string | null {
    const pt = payTable.value
    let result: string

    if (pt.classifier === 'deucesWild') {
      result = classifyDeucesWild(cards)
    } else if (pt.classifier === 'ddb') {
      result = classifyDDBHand(cards)
    } else if (pt.classifier === 'bonus') {
      result = classifyBonusHand(cards)
    } else {
      result = classifyHand(cards)
    }

    return result === 'Nothing' ? null : result
  }

  function deal() {
    if (!canDeal.value) return

    // Deduct bet
    credits.value -= coinsBet.value

    // Reset state
    resultHandName.value = null
    resultPayout.value = 0
    winningRowIndex.value = -1
    held.value = [false, false, false, false, false]
    allHoldOptions.value = []
    optimalPlay.value = null
    playerAnalysis.value = null
    lastMistakeCost.value = 0
    wasOptimal.value = true

    // Shuffle and deal 5 cards, keep rest as draw pile
    const fullDeck = shuffle(createDeck())
    hand.value = fullDeck.slice(0, 5)
    deck.value = fullDeck.slice(5)

    // Start face down, flip with stagger
    faceDown.value = [true, true, true, true, true]
    phase.value = 'dealing'

    // Save dealt deck for persona replay
    const dealtCards = fullDeck.slice(0, 5)
    const remainingCards = fullDeck.slice(5)
    dealtDecks.value.push({ cards: [...dealtCards], remaining: [...remainingCards] })

    // Start EV computation immediately in parallel with the deal animation
    const pt = payTable.value
    const coins = coinsBet.value

    setTimeout(() => {
      const options = analyzeHand(dealtCards, pt, remainingCards, coins)
      allHoldOptions.value = options
      optimalPlay.value = options[0] || null
    }, 0)

    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const updated = [...faceDown.value]
        updated[i] = false
        faceDown.value = updated
      }, (i + 1) * 100)
    }

    setTimeout(() => {
      faceDown.value = [false, false, false, false, false]
      phase.value = 'dealt'
    }, 600)
  }

  function draw() {
    if (!canDraw.value) return

    // Capture player's held indices before draw
    const playerHeldIndices = held.value
      .map((h, i) => h ? i : -1)
      .filter(i => i >= 0)

    // Find player's analysis from the 32 options
    const playerOption = allHoldOptions.value.find(opt =>
      opt.heldIndices.length === playerHeldIndices.length
      && opt.heldIndices.every(idx => playerHeldIndices.includes(idx))
    )
    playerAnalysis.value = playerOption || null

    // Calculate mistake cost
    const optimal = optimalPlay.value
    if (optimal && playerOption) {
      const evDiff = optimal.expectedValue - playerOption.expectedValue
      wasOptimal.value = evDiff < 0.0001 // floating point tolerance
      lastMistakeCost.value = evDiff * coinsBet.value * denomination.value
    }

    // Capture dealt hand for history
    const dealtCards = [...hand.value] as Card[]

    phase.value = 'drawing'

    // Flip non-held cards face down
    const newFd = held.value.map(h => !h)
    faceDown.value = newFd

    setTimeout(() => {
      // Replace non-held cards from deck
      const newHand = [...hand.value] as Card[]
      let drawIndex = 0
      for (let i = 0; i < 5; i++) {
        if (!held.value[i]) {
          newHand[i] = deck.value[drawIndex]!
          drawIndex++
        }
      }
      hand.value = newHand

      // Flip replacements back face-up with stagger
      let delay = 0
      for (let i = 0; i < 5; i++) {
        if (!held.value[i]) {
          const cardIdx = i
          setTimeout(() => {
            const updated = [...faceDown.value]
            updated[cardIdx] = false
            faceDown.value = updated
          }, delay + 200)
          delay += 100
        }
      }

      setTimeout(() => {
        faceDown.value = [false, false, false, false, false]

        // Evaluate hand
        const finalCards = hand.value.filter((c): c is Card => c !== null)
        const handName = classifyCurrentHand(finalCards)
        resultHandName.value = handName

        if (handName) {
          const payout = getPayForHand(payTable.value, handName, coinsBet.value)
          resultPayout.value = payout
          credits.value += payout
          winningRowIndex.value = payTable.value.hands.findIndex(h => h.name === handName)
          stats.value.handsWon++
          stats.value.totalReturned += payout
        } else {
          resultPayout.value = 0
          winningRowIndex.value = -1
        }

        // Update stats
        stats.value.handsPlayed++
        stats.value.totalWagered += coinsBet.value

        if (!wasOptimal.value) {
          stats.value.totalMistakes++
          stats.value.totalEVLost += lastMistakeCost.value
        }

        // Add to hand history
        handHistory.value.unshift({
          handNumber: stats.value.handsPlayed,
          dealtCards: dealtCards.filter((c): c is Card => c !== null),
          finalCards: [...finalCards],
          playerHeld: playerHeldIndices,
          optimalHeld: optimal?.heldIndices || [],
          playerEV: playerOption?.expectedValue || 0,
          optimalEV: optimal?.expectedValue || 0,
          mistakeCost: lastMistakeCost.value,
          handResult: handName,
          payout: resultPayout.value
        })

        phase.value = 'result'
      }, delay + 400)
    }, 400)
  }

  function dealOrDraw() {
    if (phase.value === 'dealt') {
      draw()
    } else if (canBet.value) {
      deal()
    }
  }

  function insertCredits() {
    credits.value = 100
    stats.value = { handsPlayed: 0, handsWon: 0, totalWagered: 0, totalReturned: 0, totalMistakes: 0, totalEVLost: 0 }
    handHistory.value = []
    resetGame()
  }

  function resetGame() {
    phase.value = 'idle'
    hand.value = [null, null, null, null, null]
    held.value = [false, false, false, false, false]
    faceDown.value = [true, true, true, true, true]
    deck.value = []
    resultHandName.value = null
    resultPayout.value = 0
    winningRowIndex.value = -1
    allHoldOptions.value = []
    optimalPlay.value = null
    playerAnalysis.value = null
    lastMistakeCost.value = 0
    wasOptimal.value = true
  }

  function resetSession() {
    stats.value = { handsPlayed: 0, handsWon: 0, totalWagered: 0, totalReturned: 0, totalMistakes: 0, totalEVLost: 0 }
    credits.value = 100
    handHistory.value = []
    dealtDecks.value = []
    personaResults.value = []
    sessionEnded.value = false
    sessionStartTime.value = Date.now()
    resetGame()
  }

  /**
   * End the session and run persona comparison.
   * Replays all dealt hands through each bot persona to show
   * how they would have done with the same cards.
   */
  function endSession() {
    if (dealtDecks.value.length === 0) return

    const results: PersonaResult[] = []
    for (const persona of PERSONAS) {
      results.push(
        replayHandsThroughPersona(
          persona.id,
          dealtDecks.value,
          payTable.value,
          coinsBet.value
        )
      )
    }
    personaResults.value = results
    sessionEnded.value = true
    saveToLocalStorage()
  }

  function saveToLocalStorage() {
    try {
      const data = {
        payTableId: payTableId.value,
        denomination: denomination.value,
        coinsBet: coinsBet.value,
        credits: credits.value,
        stats: stats.value,
        handHistory: handHistory.value.slice(0, 100), // cap at 100
        sessionStartTime: sessionStartTime.value,
        personaResults: personaResults.value,
        sessionEnded: sessionEnded.value
      }
      localStorage.setItem('vp-session', JSON.stringify(data))
    } catch { /* quota exceeded — silently fail */ }
  }

  function loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem('vp-session')
      if (!raw) return false
      const data = JSON.parse(raw)
      if (data.payTableId) payTableId.value = data.payTableId
      if (data.denomination) denomination.value = data.denomination
      if (data.coinsBet) coinsBet.value = data.coinsBet
      if (data.credits) credits.value = data.credits
      if (data.stats) stats.value = data.stats
      if (data.handHistory) handHistory.value = data.handHistory
      if (data.sessionStartTime) sessionStartTime.value = data.sessionStartTime
      if (data.personaResults) personaResults.value = data.personaResults
      if (data.sessionEnded) sessionEnded.value = data.sessionEnded
      return true
    } catch {
      return false
    }
  }

  function clearLocalStorage() {
    localStorage.removeItem('vp-session')
  }

  return {
    // State
    payTableId,
    denomination,
    coinsBet,
    phase,
    credits,
    hand,
    held,
    faceDown,
    deck,
    resultHandName,
    resultPayout,
    winningRowIndex,
    stats,

    // EV Analysis
    allHoldOptions,
    optimalPlay,
    playerAnalysis,
    lastMistakeCost,
    wasOptimal,
    handHistory,

    // Persona comparison
    personaResults,
    sessionEnded,
    dealtDecks,

    // Computed
    payTable,
    canBet,
    canHold,
    canDeal,
    canDraw,
    anyHeld,
    creditsAsDollars,
    betAsDollars,
    effectiveReturn,
    currentHoldAnalysis,
    sessionElapsedMinutes,
    handsPerHour,
    effectiveHourlyRate,

    // Actions
    setPayTable,
    setCoinsBet,
    incrementBet,
    betMax,
    toggleHold,
    deal,
    draw,
    dealOrDraw,
    insertCredits,
    resetGame,
    resetSession,
    endSession,
    saveToLocalStorage,
    loadFromLocalStorage,
    clearLocalStorage
  }
})
