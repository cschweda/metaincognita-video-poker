<template>
  <div class="h-screen flex flex-col bg-gray-950 text-white">
    <!-- Slim top status bar — the suite chrome this app was missing. The hub
         exit is pinned to its far left on EVERY route, this app's own index
         included, and is never gated behind a v-if: prominence is the point.
         It is not the in-page "Home" link, which goes to this app's setup page
         and is left exactly as it was. -->
    <nav
      aria-label="App"
      class="h-9 shrink-0 flex items-center gap-2 px-3 bg-gray-900 border-b border-gray-800"
    >
      <AppHubLink />
      <span
        class="h-4 w-px bg-gray-800"
        aria-hidden="true"
      />
      <span class="text-xs text-gray-400">
        <span class="text-primary-400">Video Poker</span> Trainer
      </span>
    </nav>

    <main class="flex-1 min-h-0 overflow-y-auto">
      <slot />
    </main>
  </div>
</template>
