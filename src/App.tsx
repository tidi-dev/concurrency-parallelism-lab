import { useEffect, useRef, useState } from 'react'
import { ExperimentControls } from './components/ExperimentControls'
import { Explanation, Misconceptions, SCENARIOS, scenario, type ScenarioId } from './components/Explanation'
import { Heartbeat, heartbeat } from './components/Heartbeat'
import { FROZEN_MS, Metrics, fmtSec } from './components/Metrics'
import { Timeline } from './components/Timeline'
import { runBlocking } from './experiments/blocking'
import { runConcurrencyLimit } from './experiments/concurrencyLimit'
import { runConcurrent } from './experiments/concurrent'
import { runConcurrentCpu } from './experiments/concurrentCpu'
import { iterationsFor } from './experiments/cpuWork'
import { runParallel } from './experiments/parallel'
import { runSequential } from './experiments/sequential'
import type { OnUpdate, TaskRecord } from './experiments/tracker'

type Runner = (onUpdate: OnUpdate) => Promise<TaskRecord[]>
type Result = { total: number; freeze: number }

// Compare: the SAME CPU work (chopping salads), three ways.
const COMPARE_LANES = [
  { key: 'blocking', emoji: '🧍', title: 'One chef, one salad at a time', tech: 'sequential · main thread' },
  { key: 'juggling', emoji: '🔀', title: 'One chef juggling all salads', tech: 'concurrent · main thread' },
  { key: 'parallel', emoji: '👩‍🍳', title: 'Helper cooks, one salad each', tech: 'parallel · Web Workers' },
] as const

// Resolves on the next animation frame, or after 100 ms if frames are paused (e.g. background tab).
const nextFrame = () =>
  new Promise<void>((r) => {
    requestAnimationFrame(() => r())
    setTimeout(r, 100)
  })
const totalOf = (tasks: TaskRecord[] = []) => Math.max(0, ...tasks.map((t) => t.end ?? 0))
const range = (n: number, prefix: string) => Array.from({ length: n }, (_, i) => `${prefix} ${i + 1}`)
const doorText = (freeze: number) => (freeze > FROZEN_MS ? `🚨 door frozen ${fmtSec(freeze)}` : '✅ door open')

const CAST = [
  ['👨‍🍳', 'The chef', 'does all the work on the page and also answers the front door.', 'main thread'],
  ['🍕', 'Pizza in the oven', 'takes time, but the chef is free while it bakes.', 'waiting: network, timers'],
  ['🥗', 'Chopping a salad', 'needs the chef’s hands the whole time.', 'computing: CPU work'],
  ['👩‍🍳', 'Helper cooks', 'extra people with their own pair of hands.', 'Web Workers'],
]

export default function App() {
  const [id, setId] = useState<ScenarioId>('sequential')
  const [tasks, setTasks] = useState(3)
  const [duration, setDuration] = useState(1000)
  const [workers, setWorkers] = useState(3)
  const [limit, setLimit] = useState(3)

  const [running, setRunning] = useState(false)
  const [lanes, setLanes] = useState<Record<string, TaskRecord[]>>({})
  const [results, setResults] = useState<Record<string, Result>>({})
  const [clock, setClock] = useState(0)
  const [history, setHistory] = useState<{ what: string; settings: string; ms: number; freeze: number }[]>([])
  const laneStarts = useRef<Record<string, number>>({})
  const s = scenario(id)

  // Live clock that grows the running bars. (It stops while the main thread is blocked: that's the point.)
  useEffect(() => {
    if (!running) return
    let frame = requestAnimationFrame(function tick() {
      setClock(performance.now())
      frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [running])

  const runners: Record<Exclude<ScenarioId, 'compare'>, Runner> = {
    sequential: (cb) => runSequential(tasks, duration, cb),
    concurrent: (cb) => runConcurrent(tasks, duration, cb),
    blocking: (cb) => runBlocking(tasks, duration, cb),
    juggling: (cb) => runConcurrentCpu(tasks, duration, cb),
    parallel: (cb) => runParallel(tasks, duration, workers, cb).then((r) => r.tasks),
    limit: (cb) => runConcurrencyLimit(tasks, duration, limit, cb),
  }

  function pick(next: ScenarioId) {
    setId(next)
    setTasks(next === 'limit' ? 10 : 3)
    setLanes({})
    setResults({})
  }

  async function run() {
    setRunning(true)
    setLanes({})
    setResults({})
    iterationsFor(duration) // one-time CPU calibration, done before the clock starts
    await nextFrame()
    laneStarts.current = {}
    setClock(performance.now())

    const lane =
      (key: string): OnUpdate =>
      (snapshot) => {
        laneStarts.current[key] ??= performance.now()
        setLanes((l) => ({ ...l, [key]: snapshot }))
      }
    // Runs one experiment and measures how long the page (the "front door") was frozen meanwhile.
    async function measure(key: string, runner: Runner) {
      heartbeat.reset()
      const done = await runner(lane(key))
      await nextFrame() // a freeze is only measured once the next frame finally arrives
      await nextFrame()
      const result = { total: totalOf(done), freeze: heartbeat.maxGap }
      setResults((r) => ({ ...r, [key]: result }))
      return result
    }

    const settings = `${tasks} × ${duration / 1000}s` + (id === 'parallel' || id === 'compare' ? ` · ${workers} helpers` : '') + (id === 'limit' ? ` · oven ${limit}` : '')
    try {
      if (id === 'compare') {
        for (const { key, title } of COMPARE_LANES) {
          const r = await measure(key, runners[key])
          setHistory((h) => [{ what: `⚖️ ${title}`, settings, ms: r.total, freeze: r.freeze }, ...h].slice(0, 15))
        }
      } else {
        const r = await measure('main', runners[id])
        setHistory((h) => [{ what: `${s.emoji} ${s.title}`, settings, ms: r.total, freeze: r.freeze }, ...h].slice(0, 15))
      }
    } finally {
      setClock(performance.now())
      setRunning(false)
    }
  }

  const nowFor = (key: string) => (laneStarts.current[key] === undefined ? 0 : clock - laneStarts.current[key])
  const expected: Record<ScenarioId, number> = {
    sequential: tasks * duration,
    concurrent: duration,
    blocking: tasks * duration,
    juggling: tasks * duration,
    parallel: Math.ceil(tasks / workers) * duration,
    limit: Math.ceil(tasks / limit) * duration,
    compare: tasks * duration,
  }
  const live = running ? Object.keys(lanes).map(nowFor) : []
  const scaleMs = Math.max(expected[id], ...live, totalOf(Object.values(lanes).flat())) * 1.04
  const taskRows = range(tasks, 'Task')
  const main = lanes.main ?? []
  const mainResult = results.main
  const usesHelpers = id === 'parallel' || id === 'compare'

  return (
    <>
      <div className="topbar">
        <span className="brand">🍳 Kitchen Lab</span>
        <Heartbeat />
      </div>

      <main>
        <header className="hero">
          <h1>Why are some apps fast, some slow, and some frozen?</h1>
          <p>
            A computer handles work a lot like a restaurant kitchen. Pick a scenario, press <b>Start cooking</b>, and
            watch the timeline and the waiter at the top.
          </p>
          <p className="muted small">Concurrency vs Parallelism Lab. Everything runs live in your browser.</p>
        </header>

        <section className="cast">
          {CAST.map(([emoji, name, text, tech]) => (
            <div key={name} className="cast-card">
              <span className="cast-emoji">{emoji}</span>
              <div>
                <strong>{name}</strong> {text}
                <small>{tech}</small>
              </div>
            </div>
          ))}
        </section>

        <nav className="picker">
          {SCENARIOS.map((sc, i) => (
            <button key={sc.id} className={sc.id === id ? 'pick active' : 'pick'} onClick={() => pick(sc.id)} disabled={running}>
              <span className="pick-num">{i + 1}</span>
              <span className="pick-emoji">{sc.emoji}</span>
              <strong>{sc.title}</strong>
              <span className="pick-pitch">{sc.pitch}</span>
              <small>{sc.tech}</small>
            </button>
          ))}
        </nav>

        <section className="panel stage">
          <div className="stage-head">
            <span className="stage-emoji">{s.emoji}</span>
            <div>
              <h2>{s.title}</h2>
              <small>{s.tech}</small>
            </div>
          </div>
          <p className="story">{s.story}</p>
          <ExperimentControls
            dish={s.dish}
            tasks={tasks}
            setTasks={setTasks}
            duration={duration}
            setDuration={setDuration}
            workers={workers}
            setWorkers={usesHelpers ? setWorkers : undefined}
            limit={limit}
            setLimit={id === 'limit' ? setLimit : undefined}
            running={running}
            onRun={run}
          />
          {usesHelpers && (
            <p className="hint">
              Your computer reports <b>{navigator.hardwareConcurrency ?? '?'}</b> cooking stations (logical processors).
            </p>
          )}
        </section>

        {id === 'compare' ? (
          <section className="panel">
            {COMPARE_LANES.map(({ key, emoji, title, tech }) => (
              <div key={key} className="compare-lane">
                <div className="lane-head">
                  <span className="lane-emoji">{emoji}</span>
                  <strong>{title}</strong>
                  <small>{tech}</small>
                  <span className="lane-result">
                    {results[key]
                      ? `⏱ ${fmtSec(results[key].total)} · ${doorText(results[key].freeze)}`
                      : lanes[key]
                        ? '⏳ cooking…'
                        : running
                          ? 'next up'
                          : ''}
                  </span>
                </div>
                <Timeline
                  tasks={lanes[key] ?? []}
                  now={nowFor(key)}
                  scaleMs={scaleMs}
                  rows={key === 'parallel' ? range(workers, 'Worker') : taskRows}
                  dish="🥗"
                  mainThread
                  legend={key === 'parallel'}
                />
              </div>
            ))}
            {COMPARE_LANES.every(({ key }) => results[key]) && (
              <div className="result">
                <table className="verdict">
                  <thead>
                    <tr>
                      <th />
                      <th>Several salads in progress at once?</th>
                      <th>Time</th>
                      <th>Front door</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARE_LANES.map(({ key, emoji, title }) => (
                      <tr key={key}>
                        <td>
                          {emoji} {title}
                        </td>
                        <td>{key === 'blocking' ? 'No' : 'Yes'}</td>
                        <td className="mono">{fmtSec(results[key].total)}</td>
                        <td>{doorText(results[key].freeze)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="lesson">💡 {s.lesson}</p>
              </div>
            )}
          </section>
        ) : (
          <section className="panel">
            <Timeline
              tasks={main}
              now={nowFor('main')}
              scaleMs={scaleMs}
              rows={id === 'parallel' ? range(workers, 'Worker') : taskRows}
              dish={s.dish}
              mainThread={id !== 'limit'}
              showWaiting={id === 'limit'}
            />
            <Metrics
              tasks={main}
              now={nowFor('main')}
              running={running}
              freezeMs={mainResult?.freeze ?? null}
              workers={id === 'parallel' ? workers : undefined}
            />
            <div className="result">
              {mainResult ? (
                <>
                  <p className="outcome">
                    {mainResult.freeze > FROZEN_MS ? '🚨' : '✅'} Done in <b>{fmtSec(mainResult.total)}</b>.{' '}
                    {mainResult.freeze > FROZEN_MS
                      ? `The front door was frozen for ${fmtSec(mainResult.freeze)}. Nobody could get in.`
                      : 'The front door stayed open the whole time.'}
                  </p>
                  <p className="lesson">💡 {s.lesson}</p>
                </>
              ) : (
                <p className="muted">
                  {running ? 'Cooking… keep an eye on the waiter at the top.' : 'Press ▶ Start cooking to see what happens.'}
                </p>
              )}
            </div>
          </section>
        )}

        <Explanation s={s} />

        {history.length > 0 && (
          <section className="panel">
            <h2>Your experiments</h2>
            <table className="history">
              <tbody>
                {history.map((h, i) => (
                  <tr key={i}>
                    <td>{h.what}</td>
                    <td className="muted">{h.settings}</td>
                    <td className="mono">{fmtSec(h.ms)}</td>
                    <td className={h.freeze > FROZEN_MS ? 'bad' : 'good'}>{doorText(h.freeze)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <Misconceptions />
      </main>
    </>
  )
}
