import { createTracker, sleep, type OnUpdate } from './tracker'

/** Runs async jobs with at most `limit` in flight at once (a tiny p-limit). */
export async function runWithLimit(jobs: (() => Promise<unknown>)[], limit: number) {
  let next = 0
  // Each "lane" pulls the next job as soon as its current one finishes.
  async function lane() {
    while (next < jobs.length) await jobs[next++]()
  }
  await Promise.all(Array.from({ length: Math.min(limit, jobs.length) }, lane))
}

export async function runConcurrencyLimit(
  count: number,
  duration: number,
  limit: number,
  onUpdate?: OnUpdate,
) {
  const tracker = createTracker(count, onUpdate)

  const jobs = tracker.tasks.map(({ id }) => async () => {
    tracker.start(id)
    await sleep(duration)
    tracker.finish(id)
  })
  await runWithLimit(jobs, limit)

  return tracker.tasks
}
