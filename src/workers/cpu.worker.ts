/// <reference lib="webworker" />
import { cpuWork } from '../experiments/cpuWork'

export interface WorkerJob {
  workerId: number
  taskId: number
  iterations: number
}
export interface WorkerStarted {
  type: 'started'
  workerId: number
  taskId: number
  startedAt: number
}
export interface WorkerResult {
  type: 'done'
  workerId: number
  taskId: number
  startedAt: number
  finishedAt: number
  duration: number
}

// Absolute time, comparable across threads (each thread has its own performance.timeOrigin).
const now = () => performance.timeOrigin + performance.now()

self.onmessage = (e: MessageEvent<WorkerJob>) => {
  const { workerId, taskId, iterations } = e.data
  const startedAt = now()
  self.postMessage({ type: 'started', workerId, taskId, startedAt } satisfies WorkerStarted)

  cpuWork(iterations) // blocks *this worker's* thread only — the page stays responsive

  const finishedAt = now()
  self.postMessage({
    type: 'done',
    workerId,
    taskId,
    startedAt,
    finishedAt,
    duration: finishedAt - startedAt,
  } satisfies WorkerResult)
}
