import { cpuWork, iterationsFor } from './cpuWork'
import { createTracker, sleep, type OnUpdate } from './tracker'

export async function runBlocking(count: number, duration: number, onUpdate?: OnUpdate) {
  const iterations = iterationsFor(duration)
  const tracker = createTracker(count, onUpdate, true)
  await sleep(100) // let the UI paint "running" once before we freeze it

  // `async` does not move work anywhere: the body runs synchronously until its first `await`.
  // There is no await here, so each call hogs the main thread until it returns.
  async function cpuTask(id: number) {
    tracker.start(id)
    cpuWork(iterations)
    tracker.finish(id)
  }

  // Looks parallel. Isn't. Each cpuTask() runs to completion before the next one is even called.
  await Promise.all(Array.from({ length: count }, (_, id) => cpuTask(id)))

  return tracker.tasks
}
