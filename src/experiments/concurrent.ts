import { createTracker, sleep, type OnUpdate } from './tracker'

export async function runConcurrent(count: number, duration: number, onUpdate?: OnUpdate) {
  const tracker = createTracker(count, onUpdate)

  async function task(id: number) {
    tracker.start(id)
    await sleep(duration) // the *waiting* overlaps; no JS is running during it
    tracker.finish(id)
  }

  // All tasks are started immediately, then we wait for all of them together.
  await Promise.all(Array.from({ length: count }, (_, id) => task(id)))

  return tracker.tasks
}
