import { createTracker, sleep, type OnUpdate } from './tracker'

// Simulated I/O (think: fetch). `await` pauses this function until the timer fires.
export async function runSequential(count: number, duration: number, onUpdate?: OnUpdate) {
  const tracker = createTracker(count, onUpdate)

  async function task(id: number) {
    tracker.start(id)
    await sleep(duration)
    tracker.finish(id)
  }

  // await task(); await task(); await task()  — the next one starts only after the previous finished.
  for (let id = 0; id < count; id++) await task(id)

  return tracker.tasks
}
