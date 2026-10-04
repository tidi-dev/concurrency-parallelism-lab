# Concurrency vs Parallelism Lab

A small, browser-only demo. Pick an experiment, click **RUN**, watch the timeline.

```bash
npm install
npm run dev      # open the printed URL (http://localhost:5173)
npm test         # timing + concurrency-limit tests (vitest)
```

The page explains everything with a **restaurant kitchen**, so it works for non-developers too:

| In the kitchen | In the computer |
|---|---|
| 👨‍🍳 The chef, who also answers the front door | the main thread, which also keeps the page responsive |
| 🍕 Pizza in the oven (chef is free while it bakes) | waiting work: network requests, timers |
| 🥗 Chopping a salad (chef's hands are busy) | computing work: CPU |
| 👩‍🍳 Helper cooks | Web Workers |
| 🔥 The oven only fits N pizzas | a concurrency limit |
| 🚪 The waiter walking at the front door | a UI heartbeat driven by the main thread. If he stops, the page is frozen |

How to read the timeline: an **outline** means an order is in progress, a **solid fill** means somebody's hands are busy with it, and the **Chef's hands** row shows what the main thread is doing at each moment.

The seven scenarios: *One at a time* (sequential), *Use the waiting time* (concurrent I/O), *Busy hands* (blocking), *Juggling* (concurrent CPU work, sliced on one thread), *Hire helper cooks* (parallel), *Oven fits only 3* (concurrency limit), and *Compare*.

```
src/
  App.tsx                         scenario picker, run logic, layout
  components/                     Timeline, Metrics, ExperimentControls, Explanation (all kitchen texts), Heartbeat (front door)
  experiments/                    sequential, concurrent, blocking, concurrentCpu, parallel, concurrencyLimit
                                  (+ tracker.ts records start/end/CPU slices, cpuWork.ts is the CPU loop)
  workers/cpu.worker.ts           runs the CPU loop on another thread
```

---

## Sequential Execution

```js
await task()   // starts, waits 1s, finishes
await task()   // only now starts
await task()
```

Each `await` pauses the function until that task is done, so the next task isn't even started yet. Total time = **sum** of durations (3 × 1s ≈ 3s). Use it when steps depend on each other.

## What is Concurrency?

Several tasks are **in progress** during the same period of time. Their lifetimes overlap. That doesn't require them to execute at the same instant. One worker can switch between them, usually while each one is waiting for something (network, disk, a timer).

In JavaScript, concurrency usually means one thread starts many async operations and handles each result when it arrives.

## What is Parallelism?

Several tasks are **executing at the same instant** on different CPU cores. This needs more than one thread (or process). In the browser, that means **Web Workers**.

## Promise.all

```js
await Promise.all([task(), task(), task()])
```

`Promise.all` doesn't run anything. All three `task()` calls have already started by the time `Promise.all` receives their promises. It just waits until all of them settle.

- If the tasks are **waiting** (fetch, timers), the waits overlap, and total time ≈ the longest one. That's concurrency.
- If the tasks are **synchronous CPU work**, each call runs to completion before the next call even begins. Total time = the sum, and the UI is frozen. The *Blocking* experiment shows this.

## Event Loop

The main thread runs one piece of JavaScript at a time, to completion. When it finishes, the event loop picks the next job: a resolved promise, a timer callback, a click, a render. `await` splits a function into pieces. The part after `await` becomes a future job that runs once the awaited thing is ready. Meanwhile the thread is free for other jobs.

Timers and network requests are handled by the browser, outside your JavaScript. That's how one thread can have 1,000 requests in flight.

## CPU Blocking

```js
async function cpuTask() { heavyLoop() }   // no await inside → runs synchronously
```

While a synchronous loop runs, the event loop can't pick up any other job. That means no rendering, no clicks, no `requestAnimationFrame`, no timers. The page freezes. Marking the function `async` doesn't help, because `async` doesn't create a thread. It only makes the function return a promise.

## Web Workers

A Web Worker is a separate JavaScript thread with its own event loop and its own memory. You talk to it only by messages (`postMessage` / `onmessage`), and data is copied between threads. Workers can't touch the DOM. Because each worker is a real thread, the OS can run several of them on different cores at the same time, while the main thread stays free to keep the UI smooth.

**More workers isn't always faster.** In the lab, try 8 tasks with 1, 2, 4 and 8 workers. On a test run (8 logical processors) the times were 8.3s, 4.1s, 2.4s and 1.6s, not 1.0s. Gains shrink because of:

- **Available cores**: logical processors ≠ physical cores, and some cores may be slower "efficiency" cores. Once there are more workers than cores, workers take turns.
- **Scheduling**: the OS shares the cores between your workers, the browser, other tabs and other apps.
- **Worker overhead**: each worker takes time and memory to start.
- **Communication overhead**: messages are copied between threads.
- **Contention**: shared caches, memory bandwidth and thermal limits.

## Concurrency Limits

```js
// at most `limit` jobs in flight
async function lane() { while (next < jobs.length) await jobs[next++]() }
await Promise.all(Array.from({ length: limit }, lane))
```

Starting everything at once (`Promise.all(10_000 requests)`) is concurrency without a limit. It overwhelms servers (rate limits), browsers (only a few connections per host), databases (connection pools) and memory. A limit keeps the work flowing at a steady rate. Total time ≈ ⌈tasks / limit⌉ × duration. In the lab, 10 × 1s tasks with limit 3 take ≈ 4s, and *Running* never goes above 3.

## Concurrency vs Parallelism

The clearest test is to give both the **same CPU work** (the *Compare* scenario). On one test run:

| 3 salads × 1 s of chopping | In progress at once? | Time | Page frozen? |
|---|---|---|---|
| One chef, one at a time (sequential) | no | 3.2 s | yes, 3.0 s |
| One chef juggling: small slices + `await` (concurrent) | yes | 3.4 s | no |
| Three helper cooks: Web Workers (parallel) | yes | 1.2 s | no |

Concurrency made the page **responsive**, but not faster. Only parallelism made it **faster**. (For *waiting* work like network requests, concurrency alone is already faster, because nobody needs to compute during the wait.)

|                         | Concurrency (async)                   | Parallelism (workers)                     |
|-------------------------|---------------------------------------|-------------------------------------------|
| What overlaps           | **waiting**                           | **computing**                             |
| Threads                 | one                                   | several                                   |
| Helps with              | I/O: network, disk, timers            | CPU: image processing, parsing, crypto    |
| Tool in JS              | `async/await`, `Promise.all`          | Web Workers (Node: `worker_threads`)      |
| CPU-heavy work          | still blocks the UI                   | runs off the main thread                  |

With waiting work, concurrent and parallel runs look identical if you only draw when each task was alive. The difference is what happens inside the bars. That's why the lab fills a bar only while a CPU is actually working on it.

**Mental model (simplified, but useful):**

- *Concurrency*: one chef, several dishes. Start the pasta, and while the water boils, start the steak. Check the pasta, flip the steak. Several dishes are in progress, but only one pair of hands.
- *Parallelism*: three chefs, three dishes, all cooking at the same moment.

Real kitchens (and CPUs) mix both: several chefs who each juggle several dishes.

## Common Interview Questions

**What is concurrency?**
Several tasks making progress during overlapping time periods. Their lifetimes overlap, but they don't necessarily execute at the same instant.

**What is parallelism?**
Several tasks executing at the same instant on multiple CPU cores or threads.

**What is the difference?**
Concurrency is about *structure*: dealing with many things at once. Parallelism is about *execution*: doing many things at once. You can have concurrency on a single core. Parallelism needs multiple cores.

**Does Promise.all run in parallel?**
No. It waits for promises that were already started. With I/O, the waits overlap (concurrency). With synchronous CPU work, the tasks run one after another on the main thread.

**Does async/await create another thread?**
No. An `async` function runs on the calling thread until its first `await`, and the rest is scheduled as a later job on the same thread.

**What are Web Workers?**
Background threads in the browser with their own event loop and memory, no DOM access, and message-based communication. They are how you get real CPU parallelism in browser JavaScript.

**Why can CPU-heavy JavaScript freeze the UI?**
The main thread runs one job at a time to completion, and rendering and input handling happen on that same thread. A long synchronous computation keeps the event loop from reaching any of them until it returns.

**Common wrong statements:** "concurrency = parallelism", "Promise.all makes JS parallel", "async/await creates threads", "100 promises = 100 threads", "Web Workers are the same as promises", "more workers is always faster", "async makes CPU-heavy work faster". Each experiment in the lab disproves at least one of them.
