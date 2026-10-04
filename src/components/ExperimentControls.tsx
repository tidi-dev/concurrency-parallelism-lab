interface Props {
  dish: string
  tasks: number
  setTasks: (n: number) => void
  duration: number
  setDuration: (n: number) => void
  workers?: number
  setWorkers?: (n: number) => void
  limit?: number
  setLimit?: (n: number) => void
  running: boolean
  onRun: () => void
}

function Choice({ options, value, onChange, disabled, format = String }: { options: number[]; value: number; onChange: (n: number) => void; disabled: boolean; format?: (n: number) => string }) {
  return (
    <div className="choices">
      {options.map((o) => (
        <button key={o} className={o === value ? 'chip active' : 'chip'} onClick={() => onChange(o)} disabled={disabled}>
          {format(o)}
        </button>
      ))}
    </div>
  )
}

export function ExperimentControls(p: Props) {
  return (
    <div className="controls">
      <label>
        Orders <small>tasks</small>
      </label>
      <div className="stepper">
        <button onClick={() => p.setTasks(Math.max(1, p.tasks - 1))} disabled={p.running} aria-label="fewer orders">−</button>
        <span className="order-count">{p.dish.repeat(Math.min(p.tasks, 10))} <b>{p.tasks}</b></span>
        <button onClick={() => p.setTasks(Math.min(16, p.tasks + 1))} disabled={p.running} aria-label="more orders">+</button>
      </div>

      <label>
        Time per dish <small>duration</small>
      </label>
      <Choice options={[500, 1000, 2000]} value={p.duration} onChange={p.setDuration} disabled={p.running} format={(n) => `${n / 1000} s`} />

      {p.setWorkers && (
        <>
          <label>
            Helper cooks <small>Web Workers</small>
          </label>
          <Choice options={[1, 2, 3, 4, 8]} value={p.workers!} onChange={p.setWorkers} disabled={p.running} />
        </>
      )}
      {p.setLimit && (
        <>
          <label>
            Oven space <small>concurrency limit</small>
          </label>
          <Choice options={[1, 2, 3, 5, 10]} value={p.limit!} onChange={p.setLimit} disabled={p.running} />
        </>
      )}

      <button className="run" onClick={p.onRun} disabled={p.running}>
        {p.running ? '⏳ Cooking…' : '▶ Start cooking'}
      </button>
    </div>
  )
}
