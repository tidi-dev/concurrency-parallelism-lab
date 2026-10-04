import type { CSSProperties } from 'react'
import type { TaskRecord } from '../experiments/tracker'

interface Props {
  tasks: TaskRecord[]
  now: number // ms since run start, used to grow running bars
  scaleMs: number // width of the time axis
  rows: string[] // row labels: "Task 1".. or "Worker 1"..
  mainThread?: boolean // add a "Chef's hands" (main thread) row showing who is using it at each moment
  dish?: string // emoji shown next to each order
  legend?: boolean
  showWaiting?: boolean // draw the queued period before a task starts
}

export const taskColor = (id: number) => `hsl(${(215 + id * 137) % 360} 70% 52%)`

// When the task was actually executing JavaScript on some thread.
function workSlices(t: TaskRecord, now: number): [number, number][] {
  if (t.start === undefined) return []
  if (!t.cpu) return [] // waiting tasks don't compute
  return t.slices ?? [[t.start, t.end ?? now]]
}

// Internal row keys stay technical ("Task 2", "Worker 1"); the labels speak kitchen.
const rowLabel = (row: string, dish: string) =>
  row.startsWith('Worker') ? `👩‍🍳 Helper ${row.slice(7)}` : `${dish} Order ${row.slice(5)}`

export function Timeline({ tasks, now, scaleMs, rows, mainThread, showWaiting, dish = '🍕', legend = true }: Props) {
  const pct = (ms: number) => `${Math.min(100, (ms / scaleMs) * 100)}%`
  const span = (from: number, to: number): CSSProperties => ({ left: pct(from), width: pct(Math.max(0, to - from)) })
  const step = scaleMs <= 2500 ? 250 : scaleMs <= 6000 ? 500 : scaleMs <= 12000 ? 1000 : 2000
  const ticks = Array.from({ length: Math.floor(scaleMs / step) + 1 }, (_, i) => i * step)
  const grid = ticks.map((t) => <div key={t} className="tl-grid" style={{ left: pct(t) }} />)

  // What the main thread is doing: CPU tasks that live on it run there; for everything else it only
  // runs a tiny bit of JS to start the task and to handle its completion (timer callback / worker message).
  const mainThreadMarks = tasks.flatMap((t) => {
    if (t.start === undefined) return []
    const color = { background: taskColor(t.id) }
    if (t.cpu && !t.row.startsWith('Worker'))
      return workSlices(t, now).map(([a, b], i) => <div key={`${t.id}-${i}`} className="tl-work" style={{ ...span(a, b), ...color }} />)
    return [t.start, t.end]
      .filter((x) => x !== undefined)
      .map((x, i) => <div key={`${t.id}-m${i}`} className="tl-work tl-mark" style={{ left: pct(x!), ...color }} />)
  })

  return (
    <div className="timeline">
      {mainThread && (
        <div className="tl-row tl-main">
          <div className="tl-label">
            👨‍🍳 Chef’s hands<small>main thread</small>
          </div>
          <div className="tl-track">
            {grid}
            {mainThreadMarks}
          </div>
        </div>
      )}
      {rows.map((label) => (
        <div className="tl-row" key={label}>
          <div className="tl-label">{rowLabel(label, dish)}</div>
          <div className="tl-track">
            {grid}
            {tasks
              .filter((t) => t.row === label)
              .map((t) => {
                const end = t.end ?? now
                const color = taskColor(t.id)
                return (
                  <div key={t.id}>
                    {showWaiting && <div className="tl-queue" style={span(0, t.start ?? now)} />}
                    {t.start !== undefined && (
                      <div
                        className={t.cpu ? 'tl-life' : 'tl-life io'}
                        style={{ ...span(t.start, end), borderColor: color, color }}
                        title={`Task ${t.id + 1}: ${t.start.toFixed(0)} → ${end.toFixed(0)} ms`}
                      >
                        {!t.cpu && <span>in the oven…</span>}
                      </div>
                    )}
                    {workSlices(t, now).map(([a, b], i) => (
                      <div key={i} className="tl-work" style={{ ...span(a, b), background: color }} />
                    ))}
                    {label.startsWith('Worker') && t.start !== undefined && (
                      <span className="tl-tag" style={{ left: pct(t.start) }}>
                        #{t.id + 1}
                      </span>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      ))}
      <div className="tl-row tl-axis">
        <div className="tl-label" />
        <div className="tl-track">
          {ticks.map((t) => (
            <span key={t} className="tl-tick mono" style={{ left: pct(t) }}>
              {t % 1000 === 0 ? `${t / 1000}s` : ''}
            </span>
          ))}
        </div>
      </div>
      {legend && (
      <div className="legend">
        <span><i className="lg-work" /> hands busy (computing)</span>
        <span><i className="lg-life" /> in progress, nobody working on it (waiting)</span>
        {mainThread && <span><i className="lg-mark" /> chef’s quick moment: put in / take out</span>}
        {showWaiting && <span><i className="lg-queue" /> waiting in line</span>}
      </div>
      )}
    </div>
  )
}
