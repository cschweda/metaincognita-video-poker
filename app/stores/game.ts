import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Card } from '~/utils/cards'
import { createDeck, shuffle } from '~/utils/cards'
import { classifyForPayTable } from '~/utils/classify'
import { PAY_TABLES, getPayForHand } from '~/utils/payTables'
import type { PayTableDef } from '~/utils/payTables'
import type { HoldAnalysis } from '~/utils/evCalculator'
import { analyzeHandAsync } from '~/utils/evAnalysisClient'
import { replayHandsThroughPersona, PERSONAS } from '~/utils/botPersonas'
import type { DealtHand, PersonaResult } from '~/utils/botPersonas'

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
  const analysisPending = ref<boolean>(false)
  const analysisError = ref<boolean>(false)

  // Guards against stale worker responses (new deal / reset supersedes old analysis)
  let analysisToken = 0
  // Set when the player draws before the analysis arrives; reconciled on arrival.
  // Carries the dealt card ids so a late analysis can still back-fill its own
  // hand even after a newer hand has been dealt.
  let pendingDrawReconcile: { playerHeldIndices: number[], handNumber: number, dealtIds: string[] } | null = null

  // --- Hand history ---
  const handHistory = ref<HandHistoryEntry[]>([])

  // --- Dealt decks for persona replay ---
  const dealtDecks = ref<DealtHand[]>([])

  // --- Session timing ---
  const sessionStartTime = ref<number>(Date.now())
  // Reactive clock: Date.now() in a computed never re-evaluates on its own.
  // BankrollPanel ticks this on an interval; draw() ticks it per hand.
  const now = ref<number>(Date.now())

  // Deal/draw animation timers, cancelled on reset so a pending flip can't
  // mutate a session that no longer owns it (e.g. navigating home mid-draw)
  let animationTimers: ReturnType<typeof setTimeout>[] = []

  function scheduleAnimation(fn: () => void, ms: number) {
    const timer = setTimeout(() => {
      animationTimers = animationTimers.filter(t => t !== timer)
      fn()
    }, ms)
    animationTimers.push(timer)
  }

  function clearAnimationTimers() {
    for (const timer of animationTimers) clearTimeout(timer)
    animationTimers = []
  }

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
    return Math.round((now.value - sessionStartTime.value) / 60000)
  })

  const handsPerHour = computed(() => {
    const minutes = (now.value - sessionStartTime.value) / 60000
    if (minutes < 0.5) return 0
    return Math.round(stats.value.handsPlayed / minutes * 60)
  })

  const effectiveHourlyRate = computed(() => {
    const minutes = (now.value - sessionStartTime.value) / 60000
    if (minutes < 0.5) return 0
    const netCredits = stats.value.totalReturned - stats.value.totalWagered
    const netDollars = netCredits * denomination.value
    return (netDollars / minutes) * 60
  })

  function tickClock() {
    now.value = Date.now()
  }

  // Live analysis: matches current hold selection against the precomputed 32 options
  const currentHoldAnalysis = computed<HoldAnalysis | null>(() => {
    if (phase.value !== 'dealt' || allHoldOptions.value.length === 0) return null
    const heldIndices = held.value
      .map((h, i) => h ? i : -1)
      .filter(i => i >= 0)
    return findHoldOption(heldIndices)
  })

  function findHoldOption(heldIndices: number[]): HoldAnalysis | null {
    return allHoldOptions.value.find(opt =>
      opt.heldIndices.length === heldIndices.length
      && opt.heldIndices.every(idx => heldIndices.includes(idx))
    ) ?? null
  }

  // --- Actions ---

  function setPayTable(id: string) {
    if (!canBet.value) return
    if (!PAY_TABLES[id]) return
    const oldId = payTableId.value
    payTableId.value = id
    // If the variant changed (not just a pay table within the same variant),
    // reset the entire session — different game, fresh start
    const oldVariant = PAY_TABLES[oldId]?.variant
    const newVariant = PAY_TABLES[id]!.variant
    if (oldVariant !== newVariant) {
      resetSession()
    } else {
      resetGame()
    }
  }

  function toggleHold(index: number) {
    if (!canHold.value) return
    if (index < 0 || index > 4) return
    const updated = [...held.value]
    updated[index] = !updated[index]
    held.value = updated
  }

  function classifyCurrentHand(cards: Card[]): string | null {
    const result = classifyForPayTable(cards, payTable.value)
    return result === 'Nothing' ? null : result
  }

  function deal() {
    if (!canDeal.value) return

    // Dealing after "End Session" resumes the session: the frozen persona
    // comparison no longer matches live play, so clear it until the next end.
    if (sessionEnded.value) {
      sessionEnded.value = false
      personaResults.value = []
    }

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
    analysisError.value = false

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
    const pt = payTable.value
    dealtDecks.value.push({ cards: [...dealtCards], remaining: [...remainingCards], payTableId: pt.id })
    const deckEntryIndex = dealtDecks.value.length - 1

    // Start EV computation in the worker, in parallel with the deal animation
    const coins = coinsBet.value
    const token = ++analysisToken
    analysisPending.value = true

    analyzeHandAsync(dealtCards, pt.id, remainingCards, coins).then((options) => {
      // A newer deal or a reset may have superseded this hand on screen, but
      // the analysis still belongs to its own hand for record-keeping.
      const isCurrent = token === analysisToken

      // Record the exact optimal hold so Perfect Pat replays true optimal
      // (guard against the session having been reset in the meantime)
      const entry = dealtDecks.value[deckEntryIndex]
      if (entry && entry.cards.every((cd, i) => cd.id === dealtCards[i]!.id)) {
        entry.optimalHeld = options[0]?.heldIndices ?? []
      }

      // If the player already drew this hand, back-fill mistake tracking
      reconcilePendingDraw(dealtCards, options, isCurrent)

      if (!isCurrent) return
      analysisPending.value = false
      allHoldOptions.value = options
      optimalPlay.value = options[0] || null
    }).catch((err) => {
      console.error('EV analysis failed for this hand:', err)
      // A reconcile recorded for this hand can never complete now
      if (pendingDrawReconcile
        && pendingDrawReconcile.dealtIds.length === dealtCards.length
        && pendingDrawReconcile.dealtIds.every((id, i) => id === dealtCards[i]!.id)) {
        pendingDrawReconcile = null
      }
      if (token !== analysisToken) return
      analysisPending.value = false
      analysisError.value = true
    })

    for (let i = 0; i < 5; i++) {
      scheduleAnimation(() => {
        const updated = [...faceDown.value]
        updated[i] = false
        faceDown.value = updated
      }, (i + 1) * 100)
    }

    scheduleAnimation(() => {
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

    // Capture dealt hand for history
    const dealtCards = [...hand.value] as Card[]

    phase.value = 'drawing'

    // Flip non-held cards face down
    const newFd = held.value.map(h => !h)
    faceDown.value = newFd

    scheduleAnimation(() => {
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
          scheduleAnimation(() => {
            const updated = [...faceDown.value]
            updated[cardIdx] = false
            faceDown.value = updated
          }, delay + 200)
          delay += 100
        }
      }

      scheduleAnimation(() => {
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
        tickClock()

        // Evaluate the player's decision against optimal. The analysis runs
        // in a worker, so a fast player can reach the result before it lands;
        // in that case the hand is reconciled when the analysis arrives.
        const optimal = optimalPlay.value
        const playerOption = findHoldOption(playerHeldIndices)
        const analysisReady = optimal !== null && playerOption !== null

        if (analysisReady) {
          playerAnalysis.value = playerOption
          const evDiff = optimal.expectedValue - playerOption.expectedValue
          wasOptimal.value = evDiff < 0.0001 // floating point tolerance
          lastMistakeCost.value = evDiff * coinsBet.value * denomination.value
          if (!wasOptimal.value) {
            stats.value.totalMistakes++
            stats.value.totalEVLost += lastMistakeCost.value
          }
        } else {
          pendingDrawReconcile = {
            playerHeldIndices,
            handNumber: stats.value.handsPlayed,
            dealtIds: dealtCards.map(c => c!.id)
          }
        }

        // Add to hand history
        handHistory.value.unshift({
          handNumber: stats.value.handsPlayed,
          dealtCards: dealtCards.filter((c): c is Card => c !== null),
          finalCards: [...finalCards],
          playerHeld: playerHeldIndices,
          optimalHeld: analysisReady ? optimal.heldIndices : [],
          playerEV: analysisReady ? playerOption.expectedValue : 0,
          optimalEV: analysisReady ? optimal.expectedValue : 0,
          mistakeCost: analysisReady ? lastMistakeCost.value : 0,
          handResult: handName,
          payout: resultPayout.value
        })

        phase.value = 'result'
      }, delay + 400)
    }, 400)
  }

  /**
   * The player drew before the worker finished analyzing the deal.
   * Back-fill mistake tracking for that hand now that the analysis is in —
   * even if the player has already dealt the next hand.
   */
  function reconcilePendingDraw(dealtCards: Card[], options: HoldAnalysis[], isCurrent: boolean) {
    if (!pendingDrawReconcile) return
    const { playerHeldIndices, handNumber, dealtIds } = pendingDrawReconcile

    // This analysis belongs to a different deal than the pending draw
    if (dealtIds.length !== dealtCards.length || !dealtIds.every((id, i) => id === dealtCards[i]!.id)) return
    pendingDrawReconcile = null

    const optimal = options[0]
    const playerOption = options.find(opt =>
      opt.heldIndices.length === playerHeldIndices.length
      && opt.heldIndices.every(idx => playerHeldIndices.includes(idx))
    )
    if (!optimal || !playerOption) return

    const evDiff = optimal.expectedValue - playerOption.expectedValue
    const optimalNow = evDiff < 0.0001 // floating point tolerance
    const cost = evDiff * coinsBet.value * denomination.value

    const entry = handHistory.value.find(h => h.handNumber === handNumber)
    if (entry) {
      entry.optimalHeld = optimal.heldIndices
      entry.playerEV = playerOption.expectedValue
      entry.optimalEV = optimal.expectedValue
      entry.mistakeCost = cost
    }

    if (!optimalNow) {
      stats.value.totalMistakes++
      stats.value.totalEVLost += cost
    }

    // Only touch the live "last hand" indicators while that hand is on screen
    if (isCurrent) {
      playerAnalysis.value = playerOption
      wasOptimal.value = optimalNow
      lastMistakeCost.value = cost
    }
  }

  function dealOrDraw() {
    if (phase.value === 'dealt') {
      draw()
    } else if (canBet.value) {
      deal()
    }
  }

  function insertCredits() {
    // Like feeding a real machine: adds money, the session continues
    credits.value += 100
  }

  function resetGame() {
    // Invalidate any in-flight worker analysis — it belongs to a cleared hand
    analysisToken++
    analysisPending.value = false
    analysisError.value = false
    pendingDrawReconcile = null

    // A pending flip timer must never mutate the cleared table
    clearAnimationTimers()

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
    now.value = Date.now()
    resetGame()
  }

  /**
   * End the session and run persona comparison.
   * Replays the completed hands through each bot persona to show
   * how they would have done with the same cards. A hand that was dealt
   * but never drawn is excluded — the player never finished it.
   */
  function endSession() {
    const completed = dealtDecks.value.slice(0, stats.value.handsPlayed)
    if (completed.length === 0) return

    const results: PersonaResult[] = []
    for (const persona of PERSONAS) {
      results.push(
        replayHandsThroughPersona(
          persona.id,
          completed,
          payTable.value,
          coinsBet.value
        )
      )
    }
    personaResults.value = results
    sessionEnded.value = true
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
    analysisPending,
    analysisError,
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
    toggleHold,
    deal,
    draw,
    dealOrDraw,
    insertCredits,
    tickClock,
    resetGame,
    resetSession,
    endSession
  }
})
