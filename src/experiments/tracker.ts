// Shared bookkeeping for every experiment: records when each task starts/ends
// (in ms relative to the run start) and pushes a fresh snapshot to the UI.

export type TaskStatus = 'waiting' | 'running' | 'done'

export interface TaskRecord {
  id: number
  row: string // timeline row label: "Task 3" or "Worker 2"
  status: TaskStatus
  start?: number
  end?: number
  cpu?: boolean // true = the task computes; false = it mostly waits (timer / network)
  slices?: [number, number][] // when a CPU task actually ran, if it ran in pieces
}

export type OnUpdate = (tasks: TaskRecord[]) => void

export function createTracker(count: number, onUpdate: OnUpdate = () => {}, cpu = false) {
  const t0 = performance.now()
  const tasks: TaskRecord[] = Array.from({ length: count }, (_, id) => ({
    id,
    row: `Task ${id + 1}`,
    status: 'waiting',
    cpu,
  }))
  const emit = () => onUpdate(tasks.map((t) => ({ ...t, slices: t.slices && [...t.slices] })))
  emit()

  return {
    t0,
    tasks,
    now: () => performance.now() - t0,
    start(id: number, row?: string, at = performance.now() - t0) {
      Object.assign(tasks[id], { status: 'running', start: at }, row && { row })
      emit()
    },
    finish(id: number, at = performance.now() - t0) {
      Object.assign(tasks[id], { status: 'done', end: at })
      emit()
    },
    slice(id: number, from: number, to: number) {
      ;(tasks[id].slices ??= []).push([from, to])
      emit()
    },
  }
}

/** Highest number of tasks whose [start, end) intervals overlap. */
export function peakConcurrency(tasks: TaskRecord[], now = Infinity): number {
  const events: [number, number][] = []
  for (const t of tasks) {
    if (t.start === undefined) continue
    events.push([t.start, 1], [t.end ?? now, -1])
  }
  // At equal timestamps process ends before starts, so back-to-back tasks don't count as overlapping.
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  let current = 0
  let peak = 0
  for (const [, delta] of events) peak = Math.max(peak, (current += delta))
  return peak
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
