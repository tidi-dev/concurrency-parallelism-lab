import { describe, expect, it } from 'vitest'
import { runSequential } from './sequential'
import { runConcurrent } from './concurrent'
import { runBlocking } from './blocking'
import { runConcurrencyLimit } from './concurrencyLimit'
import { runConcurrentCpu } from './concurrentCpu'
import { peakConcurrency, type TaskRecord } from './tracker'

const total = (tasks: TaskRecord[]) => Math.max(...tasks.map((t) => t.end!))

describe('experiments (100 ms tasks)', () => {
  it('sequential: 3 tasks take ~3× duration and never overlap', async () => {
    const tasks = await runSequential(3, 100)
    expect(total(tasks)).toBeGreaterThanOrEqual(300)
    expect(total(tasks)).toBeLessThan(380)
    expect(peakConcurrency(tasks)).toBe(1)
  })

  it('concurrent: 3 tasks take ~1× duration and all overlap', async () => {
    const tasks = await runConcurrent(3, 100)
    expect(total(tasks)).toBeGreaterThanOrEqual(100)
    expect(total(tasks)).toBeLessThan(160)
    expect(peakConcurrency(tasks)).toBe(3)
  })

  it('blocking: Promise.all over sync CPU work still runs one task at a time', async () => {
    const tasks = await runBlocking(3, 50)
    expect(peakConcurrency(tasks)).toBe(1)
    for (let i = 1; i < tasks.length; i++) expect(tasks[i].start!).toBeGreaterThanOrEqual(tasks[i - 1].end!)
  })

  it('concurrent CPU: lifetimes overlap, but only one slice runs at a time, so no speed-up', async () => {
    const tasks = await runConcurrentCpu(3, 200)
    expect(peakConcurrency(tasks)).toBe(3) // all three are "in progress" together
    const slices = tasks.flatMap((t) => t.slices!).sort((a, b) => a[0] - b[0])
    for (let i = 1; i < slices.length; i++) expect(slices[i][0]).toBeGreaterThanOrEqual(slices[i - 1][1])
    const busy = slices.reduce((sum, [a, b]) => sum + (b - a), 0)
    expect(total(tasks)).toBeGreaterThanOrEqual(busy) // total ≈ sum of all work, like sequential
  })

  it.each([1, 2, 3, 5, 10])('limit %i: active tasks never exceed the limit', async (limit) => {
    let observedMax = 0
    const tasks = await runConcurrencyLimit(10, 50, limit, (snapshot) => {
      observedMax = Math.max(observedMax, snapshot.filter((t) => t.status === 'running').length)
    })
    expect(observedMax).toBe(limit)
    expect(peakConcurrency(tasks)).toBe(limit)
    expect(tasks.every((t) => t.status === 'done')).toBe(true)
    expect(total(tasks)).toBeGreaterThanOrEqual(Math.ceil(10 / limit) * 50)
  })
})

describe('peakConcurrency', () => {
  it('treats back-to-back tasks as non-overlapping', () => {
    const t = (start: number, end: number): TaskRecord => ({ id: 0, row: '', status: 'done', start, end })
    expect(peakConcurrency([t(0, 10), t(10, 20)])).toBe(1)
    expect(peakConcurrency([t(0, 10), t(5, 20), t(6, 7)])).toBe(3)
  })
})
