import { iterationsFor } from './cpuWork'
import { createTracker, type OnUpdate } from './tracker'
import type { WorkerResult, WorkerStarted } from '../workers/cpu.worker'

export async function runParallel(
  count: number,
  duration: number,
  workerCount: number,
  onUpdate?: OnUpdate,
) {
  const iterations = iterationsFor(duration)
  const tracker = createTracker(count, onUpdate, true)
  // Workers report absolute timestamps; convert them to "ms since this run started".
  const toRelative = (absolute: number) => absolute - (performance.timeOrigin + tracker.t0)

  const workers = Array.from(
    { length: workerCount },
    () => new Worker(new URL('../workers/cpu.worker.ts', import.meta.url), { type: 'module' }),
  )
  const results: WorkerResult[] = []
  let nextTask = 0

  try {
    // Each worker processes tasks from a shared queue, one at a time.
    await Promise.all(
      workers.map(
        (worker, index) =>
          new Promise<void>((resolve, reject) => {
            const workerId = index + 1
            const sendNext = () => {
              if (nextTask >= count) return resolve()
              worker.postMessage({ workerId, taskId: nextTask++, iterations })
            }
            worker.onmessage = (e: MessageEvent<WorkerStarted | WorkerResult>) => {
              const msg = e.data
              if (msg.type === 'started') {
                tracker.start(msg.taskId, `Worker ${msg.workerId}`, toRelative(msg.startedAt))
              } else {
                results.push(msg)
                tracker.finish(msg.taskId, toRelative(msg.finishedAt))
                sendNext()
              }
            }
            worker.onerror = (e) => reject(new Error(e.message))
            sendNext()
          }),
      ),
    )
  } finally {
    workers.forEach((w) => w.terminate())
  }

  return { tasks: tracker.tasks, results }
}
