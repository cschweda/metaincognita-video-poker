<script setup lang="ts">
import type { SimulationResult } from '~/utils/simulator'

defineOptions({ name: 'analysis' })
useHead({ title: 'Statistical Analysis — Video Poker Trainer' })

const store = useAnalysisStore()

function avgReturn(runs: SimulationResult[]): number {
  if (!runs.length) return 0
  return runs.reduce((sum, r) => sum + r.actualReturn, 0) / runs.length
}

function returnRange(runs: SimulationResult[]): [number, number] {
  if (!runs.length) return [0, 0]
  return [
    Math.min(...runs.map(r => r.actualReturn)),
    Math.max(...runs.map(r => r.actualReturn))
  ]
}

function deviation(runs: SimulationResult[]): number {
  if (!runs.length || !runs[0]) return 0
  return Math.abs(avgReturn(runs) - runs[0].theoreticalReturn)
}

function avgDuration(runs: SimulationResult[]): number {
  if (!runs.length) return 0
  return runs.reduce((sum, r) => sum + r.durationMs, 0) / runs.length
}

function sortedFreqs(freqs: Record<string, number>): [string, number][] {
  return Object.entries(freqs).sort((a, b) => b[1] - a[1])
}

function downloadResults() {
  const lines: string[] = [
    `Video Poker Statistical Analysis`,
    `Generated: ${store.runTimestamp}`,
    `Hands per run: ${store.handsPerRun.toLocaleString()} | Runs: ${store.numRuns} | Duration: ${store.runDuration}s`,
    ``
  ]

  for (const variantRuns of store.results) {
    if (!variantRuns.length) continue
    const first = variantRuns[0]!
    lines.push(`=== ${first.variant} (${first.shortName}) ===`)
    lines.push(`Theoretical: ${first.theoreticalReturn.toFixed(2)}%`)
    lines.push(`Avg Actual:  ${avgReturn(variantRuns).toFixed(2)}%`)
    lines.push(`Range:       ${returnRange(variantRuns)[0].toFixed(2)}% – ${returnRange(variantRuns)[1].toFixed(2)}%`)
    lines.push(``)

    for (let i = 0; i < variantRuns.length; i++) {
      const r = variantRuns[i]!
      lines.push(`  Run ${i + 1}: ${r.actualReturn.toFixed(2)}% | Wagered: ${r.totalWagered} | Returned: ${r.totalReturned} | ${(r.durationMs / 1000).toFixed(1)}s`)
    }

    lines.push(``)
    lines.push(`  Hand frequencies (last run):`)
    for (const [hand, count] of sortedFreqs(variantRuns[variantRuns.length - 1]!.handFrequencies)) {
      lines.push(`    ${hand.padEnd(24)} ${count.toString().padStart(6)}  (${((count / store.handsPerRun) * 100).toFixed(2)}%)`)
    }
    lines.push(``)
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `video-poker-analysis-${new Date().toISOString().slice(0, 10)}.txt`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="min-h-screen bg-gray-950 text-gray-200">
    <div class="max-w-5xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-white">Statistical Analysis</h1>
          <p class="text-gray-500 text-sm mt-1">Optimal play simulation across all variants</p>
        </div>
        <NuxtLink to="/">
          <UButton variant="ghost" color="neutral" size="sm" icon="i-lucide-arrow-left">Home</UButton>
        </NuxtLink>
      </div>

      <!-- Run Controls -->
      <div class="mb-8">
        <div class="flex items-center gap-4 flex-wrap">
          <UButton
            v-if="store.status !== 'running'"
            color="primary"
            size="lg"
            @click="store.startAnalysis()"
          >
            {{ store.results.length ? 'Run New Analysis' : `Run ${store.totalHands.toLocaleString()}-Hand Analysis` }}
          </UButton>

          <UButton
            v-else
            color="error"
            variant="outline"
            size="lg"
            @click="store.cancelAnalysis()"
          >
            Cancel
          </UButton>

          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500">Hands/run:</span>
            <select
              v-model.number="store.handsPerRun"
              :disabled="store.status === 'running'"
              class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500/50 cursor-pointer"
            >
              <option :value="500">500</option>
              <option :value="1000">1,000</option>
              <option :value="5000">5,000</option>
              <option :value="10000">10,000</option>
            </select>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500">Runs:</span>
            <select
              v-model.number="store.numRuns"
              :disabled="store.status === 'running'"
              class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500/50 cursor-pointer"
            >
              <option :value="1">1</option>
              <option :value="3">3</option>
              <option :value="5">5</option>
            </select>
          </div>
        </div>

        <!-- Spinner + progress -->
        <div v-if="store.status === 'running'" class="mt-4 space-y-2">
          <div class="flex items-center gap-3">
            <div class="flex gap-1.5">
              <div class="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style="animation-delay: 0ms;" />
              <div class="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style="animation-delay: 150ms;" />
              <div class="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style="animation-delay: 300ms;" />
            </div>
            <span class="text-sm text-gray-400">{{ store.runPhase }}</span>
            <span class="text-xs text-gray-500 font-mono tabular-nums">{{ store.runProgress }}%</span>
          </div>
          <div class="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              class="h-full bg-primary-500 rounded-full transition-all duration-200"
              :style="{ width: store.runProgress + '%' }"
            />
          </div>
          <p class="text-xs text-gray-600">
            Running in background — you can navigate to other pages. Results persist.
          </p>
        </div>

        <p class="text-xs text-gray-600 mt-3">
          {{ store.totalHands.toLocaleString() }} total hands across {{ store.simTargets.length }} variants.
          Uses strategy lookup for fast optimal play. UI stays responsive during simulation.
        </p>
      </div>

      <!-- Timestamp + Download -->
      <div v-if="store.runTimestamp && store.status !== 'running'" class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-3 text-xs text-gray-600">
          <span>{{ store.runTimestamp }}</span>
          <span>&middot;</span>
          <span>{{ store.runDuration }}s runtime</span>
          <span>&middot;</span>
          <span>{{ store.totalHands.toLocaleString() }} hands</span>
        </div>
        <button
          class="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
          @click="downloadResults"
        >
          <UIcon name="i-lucide-download" class="w-3.5 h-3.5" />
          Download Full Report
        </button>
      </div>

      <!-- Results -->
      <template v-if="store.results.some(r => r.length > 0)">
        <section
          v-for="(variantRuns, vi) in store.results"
          :key="vi"
          class="mb-10"
        >
          <template v-if="variantRuns.length > 0">
            <h2 class="text-xl font-bold text-white mb-4">
              {{ variantRuns[0]?.variant }}
              <span class="text-gray-500 font-normal text-base ml-2">{{ variantRuns[0]?.shortName }}</span>
            </h2>

            <!-- Metrics Grid -->
            <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <div class="bg-gray-800/60 rounded-lg p-3">
                <div class="text-[0.65rem] text-gray-500 uppercase tracking-wider">Theoretical</div>
                <div class="text-lg font-bold font-mono text-white mt-1">{{ variantRuns[0]?.theoreticalReturn.toFixed(2) }}%</div>
              </div>
              <div class="bg-gray-800/60 rounded-lg p-3">
                <div class="text-[0.65rem] text-gray-500 uppercase tracking-wider">Avg Actual</div>
                <div
                  class="text-lg font-bold font-mono mt-1"
                  :class="{
                    'text-green-400': deviation(variantRuns) < 1,
                    'text-amber-400': deviation(variantRuns) >= 1 && deviation(variantRuns) < 3,
                    'text-red-400': deviation(variantRuns) >= 3,
                  }"
                >
                  {{ avgReturn(variantRuns).toFixed(2) }}%
                </div>
              </div>
              <div class="bg-gray-800/60 rounded-lg p-3">
                <div class="text-[0.65rem] text-gray-500 uppercase tracking-wider">Deviation</div>
                <div
                  class="text-lg font-bold font-mono mt-1"
                  :class="{
                    'text-green-400': deviation(variantRuns) < 1,
                    'text-amber-400': deviation(variantRuns) >= 1 && deviation(variantRuns) < 3,
                    'text-red-400': deviation(variantRuns) >= 3,
                  }"
                >
                  {{ (avgReturn(variantRuns) - variantRuns[0]!.theoreticalReturn) >= 0 ? '+' : '' }}{{ (avgReturn(variantRuns) - variantRuns[0]!.theoreticalReturn).toFixed(2) }}%
                </div>
              </div>
              <div class="bg-gray-800/60 rounded-lg p-3">
                <div class="text-[0.65rem] text-gray-500 uppercase tracking-wider">Range</div>
                <div class="text-sm font-bold font-mono text-gray-400 mt-1.5">
                  {{ returnRange(variantRuns)[0].toFixed(1) }}% – {{ returnRange(variantRuns)[1].toFixed(1) }}%
                </div>
              </div>
              <div class="bg-gray-800/60 rounded-lg p-3">
                <div class="text-[0.65rem] text-gray-500 uppercase tracking-wider">Avg Time</div>
                <div class="text-sm font-bold font-mono text-gray-400 mt-1.5">
                  {{ (avgDuration(variantRuns) / 1000).toFixed(1) }}s
                </div>
              </div>
            </div>

            <!-- Per-run table -->
            <div class="overflow-x-auto mb-4">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-700 text-gray-400 text-xs">
                    <th class="text-left py-2 px-2">Run</th>
                    <th class="text-right px-2">Return</th>
                    <th class="text-right px-2">Delta</th>
                    <th class="text-right px-2">Wagered</th>
                    <th class="text-right px-2">Returned</th>
                    <th class="text-right px-2">Net</th>
                    <th class="text-right px-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(run, ri) in variantRuns"
                    :key="ri"
                    class="border-b border-gray-800/50"
                  >
                    <td class="py-1.5 px-2 text-white font-mono">#{{ ri + 1 }}</td>
                    <td
                      class="text-right px-2 font-mono"
                      :class="{
                        'text-green-400': Math.abs(run.actualReturn - run.theoreticalReturn) < 1,
                        'text-amber-400': Math.abs(run.actualReturn - run.theoreticalReturn) >= 1 && Math.abs(run.actualReturn - run.theoreticalReturn) < 3,
                        'text-red-400': Math.abs(run.actualReturn - run.theoreticalReturn) >= 3,
                      }"
                    >
                      {{ run.actualReturn.toFixed(2) }}%
                    </td>
                    <td
                      class="text-right px-2 font-mono"
                      :class="run.actualReturn >= run.theoreticalReturn ? 'text-green-400' : 'text-amber-400'"
                    >
                      {{ (run.actualReturn - run.theoreticalReturn) >= 0 ? '+' : '' }}{{ (run.actualReturn - run.theoreticalReturn).toFixed(2) }}%
                    </td>
                    <td class="text-right px-2 font-mono text-gray-400">{{ run.totalWagered.toLocaleString() }}</td>
                    <td class="text-right px-2 font-mono text-gray-400">{{ run.totalReturned.toLocaleString() }}</td>
                    <td
                      class="text-right px-2 font-mono font-semibold"
                      :class="run.totalReturned >= run.totalWagered ? 'text-green-400' : 'text-red-400'"
                    >
                      {{ run.totalReturned >= run.totalWagered ? '+' : '' }}{{ (run.totalReturned - run.totalWagered).toLocaleString() }}
                    </td>
                    <td class="text-right px-2 font-mono text-gray-500">{{ (run.durationMs / 1000).toFixed(1) }}s</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Hand frequencies -->
            <details class="group">
              <summary class="cursor-pointer text-xs text-blue-400 hover:text-blue-300 font-semibold mb-2">
                Hand Frequencies (Run {{ variantRuns.length }})
              </summary>
              <div class="overflow-x-auto mt-2">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-gray-700 text-gray-500 text-xs">
                      <th class="text-left py-1 px-2">Hand</th>
                      <th class="text-right px-2">Count</th>
                      <th class="text-right px-2">Frequency</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="[hand, count] in sortedFreqs(variantRuns[variantRuns.length - 1]!.handFrequencies)"
                      :key="hand"
                      class="border-b border-gray-800/30"
                    >
                      <td class="py-1 px-2 font-mono text-gray-300">{{ hand }}</td>
                      <td class="text-right px-2 font-mono text-gray-400">{{ count.toLocaleString() }}</td>
                      <td class="text-right px-2 font-mono text-gray-500">{{ ((count / store.handsPerRun) * 100).toFixed(2) }}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </details>
          </template>
        </section>

        <!-- Convergence note -->
        <div class="bg-gray-800/40 border border-gray-700/50 rounded-xl p-5 text-sm text-gray-400 mb-8">
          <p class="font-semibold text-white mb-2">About Convergence</p>
          <p>At <strong class="text-amber-400">1,000 hands</strong> variance is extreme — returns can range from 85% to 115%. This is normal.</p>
          <p class="mt-1">At <strong class="text-amber-400">10,000 hands</strong> returns typically converge within 1-2% of the theoretical value.</p>
          <p class="mt-1">At <strong class="text-amber-400">100,000+ hands</strong> convergence is tight — within 0.1-0.3% of theoretical.</p>
          <p class="mt-2 text-gray-500">This demonstrates why even +EV games like Deuces Wild (100.76%) are hard to profit from in short sessions. The variance zone is real.</p>
        </div>

        <!-- Methodology & caveats -->
        <div class="bg-gray-800/40 border border-gray-700/50 rounded-xl p-5 text-sm text-gray-400 mb-8">
          <p class="font-semibold text-white mb-2">Methodology &amp; Caveats</p>

          <p class="font-semibold text-gray-300 mt-3 mb-1">What's exact</p>
          <ul class="list-disc pl-5 space-y-1">
            <li><strong class="text-gray-300">Deck &amp; RNG</strong> — crypto.getRandomValues + Fisher-Yates shuffle. Each of 2,598,960 possible hands is equally likely. Deals from a real 52-card deck without replacement.</li>
            <li><strong class="text-gray-300">Hand classification</strong> — Deterministic classifier for all hand types, verified against standard poker hand rankings.</li>
            <li><strong class="text-gray-300">Pay table payouts</strong> — Taken directly from published sources (Wizard of Odds).</li>
            <li><strong class="text-gray-300">In-game EV calculator</strong> — The training panel's 32-option analysis evaluates <em>every possible draw outcome</em> exhaustively. Those EV numbers are mathematically exact.</li>
          </ul>

          <p class="font-semibold text-gray-300 mt-3 mb-1">What's approximate</p>
          <ul class="list-disc pl-5 space-y-1">
            <li><strong class="text-gray-300">Strategy lookup vs brute-force EV</strong> — Simulation uses published strategy tables (~30-45 entries per variant) instead of brute-force EV. This is the same approach real players use. The only missing element is <strong class="text-amber-400">penalty card adjustments</strong>, which affect ~2% of hands and cost ~0.01% EV each. Estimated total EV loss: &lt;0.1% for all standard variants.</li>
            <li><strong class="text-gray-300">Deuces Wild</strong> — Uses a proper deuce-count-organized strategy (0, 1, 2, 3, 4 deuces each have their own decision tree). This matches the published Wizard of Odds strategy. Minor edge cases in wild straight/flush draws may not be perfectly optimized.</li>
            <li><strong class="text-gray-300">DDB kicker holds</strong> — The strategy correctly holds kicker cards (2, 3, 4) alongside three Aces or three 2s-4s, enabling the 400-coin and 160-coin bonus payouts.</li>
            <li><strong class="text-gray-300">Variance at low sample sizes</strong> — At 1,000 hands, actual return can deviate 5-15% from theoretical. This is mathematically correct behavior (law of large numbers), not a bug. Run 10,000+ hands for tighter convergence.</li>
          </ul>

          <p class="font-semibold text-gray-300 mt-3 mb-1">Bottom line</p>
          <p>For all variants, simulation returns should converge within <strong class="text-green-400">~0.5% of theoretical</strong> at 10,000+ hands. The remaining gap is primarily from penalty card omission and natural variance, not strategy errors. The in-game training panel's per-hand EV analysis is always mathematically exact regardless of variant.</p>
        </div>
      </template>

      <!-- Empty state -->
      <div v-if="!store.results.length && store.status === 'idle'" class="text-center py-20 text-gray-600">
        <p class="text-lg mb-2">Click the button above to run the analysis</p>
        <p class="text-sm">{{ store.totalHands.toLocaleString() }} hands of optimal play across {{ store.simTargets.length }} video poker variants.</p>
        <p class="text-sm mt-1">Verifies the engine produces returns matching published theoretical values.</p>
      </div>

      <footer class="border-t border-gray-800 pt-4 mt-10 flex items-center justify-center gap-4 text-xs text-gray-500">
        <NuxtLink to="/" class="hover:text-gray-300 transition-colors">Home</NuxtLink>
        <span>&middot;</span>
        <NuxtLink to="/game" class="hover:text-gray-300 transition-colors">Game</NuxtLink>
        <span>&middot;</span>
        <NuxtLink to="/analysis" class="hover:text-gray-300 transition-colors">Analysis</NuxtLink>
        <span>&middot;</span>
        <a href="https://github.com/cschweda/metaincognita-video-poker" target="_blank" rel="noopener" class="hover:text-gray-300 transition-colors flex items-center gap-1">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          GitHub
        </a>
      </footer>
    </div>
  </div>
</template>
