import { defineStore } from 'pinia'
import { PAY_TABLES, PAY_TABLE_GROUPS } from '~/utils/payTables'
import type { SimulationResult } from '~/utils/simulator'

export type AnalysisStatus = 'idle' | 'running' | 'done'

export const useAnalysisStore = defineStore('analysis', () => {
  const status = ref<AnalysisStatus>('idle')
  const runPhase = ref('')
  const runProgress = ref(0) // 0-100 overall
  const runTimestamp = ref<string | null>(null)
  const runDuration = ref(0)
  const handsPerRun = ref(1000)
  const numRuns = ref(3)

  // results[variantIndex][runIndex]
  const results = ref<SimulationResult[][]>([])

  let worker: Worker | null = null

  const simTargets = computed(() =>
    PAY_TABLE_GROUPS.map(g => ({
      group: g,
      payTable: PAY_TABLES[g.tables[0]!]!
    }))
  )

  const totalHands = computed(() =>
    handsPerRun.value * numRuns.value * simTargets.value.length
  )

  // Track progress across all variants and runs
  const totalJobs = computed(() => simTargets.value.length * numRuns.value)
  let completedJobs = 0
  let currentJobProgress = 0

  function updateOverallProgress() {
    const jobFraction = completedJobs / totalJobs.value
    const currentFraction = currentJobProgress / totalJobs.value
    runProgress.value = Math.round((jobFraction + currentFraction) * 100)
  }

  function startAnalysis() {
    if (status.value === 'running') return

    status.value = 'running'
    results.value = []
    completedJobs = 0
    currentJobProgress = 0
    runProgress.value = 0

    // Initialize results array structure
    const emptyResults: SimulationResult[][] = simTargets.value.map(() => [])

    const startTime = Date.now()

    // Create worker with relative path (Vite resolves this)
    worker = new Worker(
      new URL('../utils/simulationWorker.ts', import.meta.url),
      { type: 'module' }
    )

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data

      if (msg.type === 'progress') {
        const { variantIndex, runIndex, completed, total } = msg
        const target = simTargets.value[variantIndex]
        runPhase.value = `${target?.payTable.variant ?? '?'} — Run ${runIndex + 1}/${numRuns.value}`
        currentJobProgress = completed / total
        updateOverallProgress()
      }

      if (msg.type === 'result') {
        const { variantIndex, result } = msg
        emptyResults[variantIndex]!.push(result as SimulationResult)
        completedJobs++
        currentJobProgress = 0
        updateOverallProgress()

        // Update results reactively after each variant completes all runs
        results.value = [...emptyResults]
      }

      if (msg.type === 'allDone') {
        runDuration.value = Math.round((Date.now() - startTime) / 1000)
        runTimestamp.value = new Date().toLocaleString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        })
        runProgress.value = 100
        status.value = 'done'
        runPhase.value = ''
        worker?.terminate()
        worker = null
      }
    }

    worker.onerror = (err) => {
      console.error('Simulation worker error:', err)
      status.value = 'idle'
      worker?.terminate()
      worker = null
    }

    // Send all work to the worker in one message
    const targets = simTargets.value.map(t => ({
      payTable: JSON.parse(JSON.stringify(t.payTable)) // plain object for postMessage
    }))

    worker.postMessage({
      type: 'runAll',
      targets,
      numHands: handsPerRun.value,
      numRuns: numRuns.value,
      coins: 5
    })
  }

  function cancelAnalysis() {
    worker?.terminate()
    worker = null
    status.value = 'idle'
    runPhase.value = 'Cancelled'
  }

  return {
    status,
    runPhase,
    runProgress,
    runTimestamp,
    runDuration,
    handsPerRun,
    numRuns,
    results,
    simTargets,
    totalHands,
    startAnalysis,
    cancelAnalysis
  }
})
