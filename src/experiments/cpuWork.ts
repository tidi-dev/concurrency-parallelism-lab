// Deterministic CPU-bound loop used by both the main thread and the workers.
// Cost is linear in `iterations`, so N tasks = N × the work.
export function cpuWork(iterations: number): number {
  let x = 1
  for (let i = 0; i < iterations; i++) {
    x = (Math.imul(x, 1664525) + 1013904223) | 0 // LCG step: cheap, unoptimizable-away math
  }
  return x
}

let iterationsPerMs = 0

/** Measures this machine so that one CPU task takes roughly `durationMs`. */
export function iterationsFor(durationMs: number): number {
  if (!iterationsPerMs) {
    cpuWork(2_000_000) // warm up the JIT
    let best = 0
    for (let i = 0; i < 5; i++) {
      const t = performance.now()
      cpuWork(5_000_000)
      best = Math.max(best, 5_000_000 / Math.max(performance.now() - t, 0.01))
    }
    iterationsPerMs = best
  }
  return Math.round(iterationsPerMs * durationMs)
}
