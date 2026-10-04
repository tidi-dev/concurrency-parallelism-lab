import { useEffect, useRef } from 'react'

// Longest gap between two animation frames since the last reset — i.e. how long the UI was frozen.
export const heartbeat = {
  maxGap: 0,
  reset() {
    this.maxGap = 0
  },
}

/**
 * The "front door": a waiter walking back and forth, driven by JavaScript on the main thread
 * (requestAnimationFrame + setInterval) on purpose. A CSS animation could keep running on the
 * compositor thread and hide the freeze.
 */
export function Heartbeat() {
  const dot = useRef<HTMLDivElement>(null)
  const counter = useRef<HTMLElement>(null)

  useEffect(() => {
    let frame = 0
    let last = performance.now()
    const loop = (t: number) => {
      heartbeat.maxGap = Math.max(heartbeat.maxGap, t - last)
      last = t
      const x = (Math.sin(t / 300) + 1) / 2 // 0..1, back and forth
      if (dot.current) dot.current.style.left = `calc(${x * 100}% - ${x * 28}px)`
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)

    let beats = 0
    const interval = setInterval(() => {
      if (counter.current) counter.current.textContent = String(++beats)
    }, 250)

    return () => {
      cancelAnimationFrame(frame)
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="door" title="Driven by the page's main thread. If the waiter stops, the page is frozen.">
      <div className="door-text">
        <strong>🚪 Front door</strong>
        <span>
          Customers greeted: <b ref={counter} className="mono">0</b>
        </span>
        <small>If the waiter stops walking, the kitchen is frozen and the page can’t react to you.</small>
      </div>
      <div className="door-track">
        <div ref={dot} className="door-waiter">🧍</div>
      </div>
    </div>
  )
}
