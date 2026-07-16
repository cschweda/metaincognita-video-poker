/**
 * Seedable PRNG utilities for simulation and tests.
 *
 * xorshift32 is fast and uniform enough for Monte-Carlo simulation. It is
 * NOT crypto-quality and must never shuffle a real dealt hand — the game
 * path uses crypto.getRandomValues (the default in cards.ts shuffle).
 */
export function makeRng(seed: number): () => number {
  let s = seed >>> 0
  if (s === 0) s = 0x9E3779B9 // xorshift is stuck at 0; nudge to a golden-ratio seed
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    s >>>= 0
    return s / 0x100000000
  }
}

/** Uniform-enough integer in [0, n) from a unit-interval PRNG. */
export function prngInt(rng: () => number, n: number): number {
  return Math.floor(rng() * n)
}
