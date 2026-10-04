import { cpuWork, iterationsFor } from './cpuWork'
import { createTracker, sleep, type OnUpdate } from './tracker'

const SLICE_MS = 40

// The same CPU work as the Blocking/Parallel experiments, made *concurrent* on ONE thread:
// each task computes a small slice, then `await`s so the other tasks (and the UI) get a turn.
// Tasks overlap in time, but only one slice runs at any instant → no speed-up.
export async function runConcurrentCpu(count: number, duration: number, onUpdate?: OnUpdate) {
  const total = iterationsFor(duration)
  const perSlice = iterationsFor(SLICE_MS)
  const tracker = createTracker(count, onUpdate, true)

  async function cpuTask(id: number) {
    tracker.start(id)
    for (let done = 0; done < total; done += perSlice) {
      const from = tracker.now()
      cpuWork(Math.min(perSlice, total - done))
      tracker.slice(id, from, tracker.now())
      await sleep(0) // yield: let the event loop run another task's slice, or a render
    }
    tracker.finish(id)
  }

  await Promise.all(Array.from({ length: count }, (_, id) => cpuTask(id)))

  return tracker.tasks
}
