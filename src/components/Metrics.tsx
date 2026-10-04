import { peakConcurrency, type TaskRecord } from '../experiments/tracker'

interface Props {
  tasks: TaskRecord[]
  now: number
  running: boolean
  freezeMs: number | null
  workers?: number
}

export const fmtSec = (ms: number) => `${(ms / 1000).toFixed(2)}s`
export const FROZEN_MS = 200

export function Metrics({ tasks, now, running, freezeMs, workers }: Props) {
  const count = (s: TaskRecord['status']) => tasks.filter((t) => t.status === s).length
  const total = running ? now : Math.max(0, ...tasks.map((t) => t.end ?? 0))
  const frozen = (freezeMs ?? 0) > FROZEN_MS

  // [kitchen label, technical name, value, highlight]
  const items: [string, string, string | number, string?][] = [
    ['Orders', 'total tasks', tasks.length],
    ['Cooking now', 'running', count('running')],
    ['Waiting in line', 'waiting', count('waiting')],
    ['Done', 'completed', count('done')],
    ['Time taken', 'total duration', tasks.length ? fmtSec(total) : '—'],
    ['Most at once', 'peak concurrency', peakConcurrency(tasks, now)],
    [
      'Front door',
      'longest UI freeze',
      freezeMs === null ? '—' : frozen ? `frozen ${fmtSec(freezeMs)}` : 'open ✓',
      freezeMs === null ? undefined : frozen ? 'bad' : 'good',
    ],
  ]
  if (workers !== undefined) {
    items.push(
      ['Helper cooks', 'workers', workers],
      ['Stations in your computer', 'logical processors', navigator.hardwareConcurrency ?? '?'],
    )
  }

  return (
    <div className="metrics">
      {items.map(([label, tech, value, tone]) => (
        <div key={label} className={`metric ${tone ?? ''}`}>
          <div className="metric-label">{label}</div>
          <div className="metric-value">{value}</div>
          <div className="metric-tech">{tech}</div>
        </div>
      ))}
    </div>
  )
}
