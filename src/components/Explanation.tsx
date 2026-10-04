import type { ReactNode } from 'react'

export type ScenarioId = 'sequential' | 'concurrent' | 'blocking' | 'juggling' | 'parallel' | 'limit' | 'compare'

export interface Scenario {
  id: ScenarioId
  emoji: string
  title: string // plain-language name
  tech: string // the technical name
  pitch: string // one line on the picker card
  dish: string // what each order is
  story: ReactNode // what happens in the kitchen
  lesson: ReactNode // the takeaway
  techNote: ReactNode // the same thing in developer terms
  code: string
  example: string
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'sequential',
    emoji: '🧍',
    title: 'One at a time',
    tech: 'Sequential',
    pitch: 'Chef bakes one pizza, waits, then starts the next.',
    dish: '🍕',
    story: (
      <>
        The chef puts pizza #1 in the oven and <strong>stands there waiting</strong> until it is done. Only then does
        pizza #2 go in. The oven has room for more, but the chef doesn’t use it.
      </>
    ),
    lesson: <>Total time = all the waiting added up: 3 pizzas × 1 s ≈ 3 s.</>,
    techNote: (
      <>
        Each <code>await</code> pauses until that task finishes, so the next task hasn’t even started. Fine when
        steps depend on each other.
      </>
    ),
    code: `async function bakePizza() {\n  await oven(1000)   // wait 1 s\n}\n\nawait bakePizza()\nawait bakePizza()\nawait bakePizza()`,
    example: 'Log in → then load your profile → then load your orders.',
  },
  {
    id: 'concurrent',
    emoji: '🍕',
    title: 'Use the waiting time',
    tech: 'Concurrency (waiting)',
    pitch: 'Chef puts all pizzas in the oven at once.',
    dish: '🍕',
    story: (
      <>
        The chef slides <strong>all pizzas into the oven</strong> right away, then waits once. Look at the
        <em> Chef’s hands</em> row: it’s almost empty. The chef only works for a moment at the start and at the end.
        While the pizzas bake, <strong>nobody is cooking</strong>. The oven does the work.
      </>
    ),
    lesson: (
      <>
        ≈ 1 s instead of 3 s, with <strong>still just one chef</strong>. This is concurrency: several orders in progress
        at the same time. It’s <strong>not</strong> extra cooks. It only helps because the time was spent waiting.
      </>
    ),
    techNote: (
      <>
        <code>Promise.all</code> starts every request, then waits for all of them. The single JavaScript thread is idle
        while the browser does the waiting (timers, network). Concurrency ≠ parallelism.
      </>
    ),
    code: `await Promise.all([\n  bakePizza(),\n  bakePizza(),\n  bakePizza(),\n])`,
    example: 'An app loading your messages, photos and notifications at the same time.',
  },
  {
    id: 'blocking',
    emoji: '🥗',
    title: 'Busy hands',
    tech: 'Blocking the main thread',
    pitch: 'Chef chops 3 salads by hand. Nobody opens the door.',
    dish: '🥗',
    story: (
      <>
        Now each order is a salad, and chopping needs the <strong>chef’s own hands</strong>. Shouting “make all three
        at once!” doesn’t help, because one person can only chop one salad at a time. Worse, while chopping, the chef can’t
        answer the front door. <strong>Watch the waiter at the top: he stops walking.</strong>
      </>
    ),
    lesson: (
      <>
        Still ≈ 3 s, one salad after another, and the <strong>door was frozen</strong> the whole time. This is why an app
        “hangs” while it’s busy calculating.
      </>
    ),
    techNote: (
      <>
        <code>Promise.all</code> over CPU work changes nothing. Each <code>async</code> function runs synchronously
        until it finishes. While the main thread is busy, the browser can’t redraw the page or respond to clicks.
      </>
    ),
    code: `async function chopSalad() {\n  chop()   // hands busy, no waiting\n}\n\n// Looks parallel. It isn't.\nawait Promise.all([\n  chopSalad(),\n  chopSalad(),\n  chopSalad(),\n])`,
    example: 'A page freezing while it processes a big file or a huge table.',
  },
  {
    id: 'juggling',
    emoji: '🔀',
    title: 'Juggling',
    tech: 'Concurrency (CPU work)',
    pitch: 'Chef chops a bit of each salad in turn, and checks the door in between.',
    dish: '🥗',
    story: (
      <>
        The chef chops <strong>a little of salad 1, a little of salad 2, a little of salad 3</strong>, and so on, and
        glances at the door between pieces. All three salads are “in progress” at once. But look at the{' '}
        <em>Chef’s hands</em> row: there is only ever <strong>one</strong> color at any moment.
      </>
    ),
    lesson: (
      <>
        The door stays open 👍, but it’s <strong>not faster</strong>: still ≈ 3 s. Juggling (concurrency) makes the
        kitchen <em>responsive</em>. It doesn’t give the chef more hands.
      </>
    ),
    techNote: (
      <>
        Splitting CPU work into small pieces with <code>await</code> between them lets the event loop render and handle
        clicks. The tasks overlap in time, but they still share one thread, so the total time doesn’t change.
      </>
    ),
    code: `async function chopSalad() {\n  while (!done) {\n    chopALittle()      // ~40 ms\n    await nextTurn()   // let others go\n  }\n}\n\nawait Promise.all([\n  chopSalad(), chopSalad(), chopSalad(),\n])`,
    example: 'A spreadsheet recalculating in chunks so you can keep scrolling.',
  },
  {
    id: 'parallel',
    emoji: '👩‍🍳',
    title: 'Hire helper cooks',
    tech: 'Parallelism (Web Workers)',
    pitch: 'Each helper chops their own salad at the same time.',
    dish: '🥗',
    story: (
      <>
        The chef hands each salad to a <strong>helper cook</strong> at another station. The helpers chop{' '}
        <strong>at the same time</strong>, and the chef stays free to answer the door. The waiter keeps walking.
      </>
    ),
    lesson: (
      <>
        ≈ 1 s with 3 helpers. That’s real parallelism. But <strong>more cooks isn’t always faster</strong>: try 8 orders
        with 1, 2, 4 and 8 helpers. Your computer only has so many stations (CPU cores), each helper needs time to set
        up, orders must be passed back and forth, and everyone shares the same kitchen.
      </>
    ),
    techNote: (
      <>
        Each Web Worker is a separate thread. The OS can run them on different CPU cores at the same instant. They
        communicate with the page only by messages, so the main thread stays responsive.
      </>
    ),
    code: `// page (the chef)\nconst helper = new Worker('cook.js')\nhelper.postMessage({ order: 1 })\nhelper.onmessage = (e) => serve(e.data)\n\n// cook.js (a helper, own thread)\nonmessage = () => {\n  chop()\n  postMessage('done')\n}`,
    example: 'Photo editors applying a filter, video compression, password hashing.',
  },
  {
    id: 'limit',
    emoji: '🔥',
    title: 'Oven fits only 3',
    tech: 'Concurrency limit',
    pitch: '10 pizzas, but only a few fit in the oven at once.',
    dish: '🍕',
    story: (
      <>
        10 pizza orders arrive, but the oven only has room for a few. The rest <strong>wait in line</strong> (thin
        gray line). As soon as one pizza comes out, the next one goes in. Change “Oven space” and watch the line.
      </>
    ),
    lesson: (
      <>
        Time ≈ ⌈10 ÷ oven space⌉ × 1 s. Real apps do the same on purpose: servers, networks and databases have limits too.
        Sending 10,000 requests at once tends to fail. Sending them 10 at a time works.
      </>
    ),
    techNote: (
      <>
        A small pool runs at most <code>limit</code> async jobs at once; when one finishes, the next starts. “Cooking
        now” never goes above the limit.
      </>
    ),
    code: `// at most \`limit\` in the oven\nasync function ovenSlot() {\n  while (next < orders.length)\n    await bake(orders[next++])\n}\nawait Promise.all(\n  Array.from({ length: limit }, ovenSlot)\n)`,
    example: 'Uploading 500 photos, 4 at a time.',
  },
  {
    id: 'compare',
    emoji: '⚖️',
    title: 'Compare',
    tech: 'Sequential vs Concurrent vs Parallel',
    pitch: 'The same salads, three ways. See which is faster and which freezes.',
    dish: '🥗',
    story: (
      <>
        The <strong>same salads</strong> are made three ways, one after another, on the same clock. Watch two things:
        how long each way takes, and whether the waiter at the door keeps walking.
      </>
    ),
    lesson: (
      <>
        <strong>Juggling (concurrency)</strong> keeps the door open but isn’t faster.{' '}
        <strong>More cooks (parallelism)</strong> is what makes it faster. For pizzas in the oven (waiting), juggling is
        enough. For chopping (computing), you need more cooks.
      </>
    ),
    techNote: (
      <>
        Concurrency is about <em>dealing</em> with many things at once (overlapping in time). Parallelism is about{' '}
        <em>doing</em> many things at once (several CPUs working at the same instant).
      </>
    ),
    code: `// one at a time:  chop(); chop(); chop()\n// juggling:        slices + await, one thread\n// helpers:         3 Web Workers, 3 threads`,
    example: 'Concurrency = one chef juggling. Parallelism = several chefs.',
  },
]

export const scenario = (id: ScenarioId) => SCENARIOS.find((s) => s.id === id)!

export function Explanation({ s }: { s: Scenario }) {
  return (
    <section className="panel explanation">
      <p className="example">
        <strong>🌍 In real apps:</strong> {s.example}
      </p>
      <details>
        <summary>🧑‍💻 For developers: {s.tech}</summary>
        <div className="dev">
          <p>{s.techNote}</p>
          <pre className="code">{s.code}</pre>
        </div>
      </details>
    </section>
  )
}

const MYTHS: [string, string, string][] = [
  ['Juggling = more cooks', 'Concurrency = parallelism', 'Compare: juggling took as long as one at a time.'],
  ['Shouting “all at once!” makes the chef faster', 'Promise.all makes JavaScript parallel', 'Busy hands: still one salad after another.'],
  ['Saying “I’ll do it later” hires a new cook', 'async/await creates threads', 'Busy hands: the same chef does all the work.'],
  ['100 pizzas in the oven = 100 chefs', '100 promises = 100 threads', 'Use the waiting time: one chef, many pizzas.'],
  ['Helper cooks are just a to-do list', 'Web Workers are the same as promises', 'Hire helpers vs Busy hands: only helpers add hands.'],
  ['More cooks is always faster', 'More workers always means faster', 'Hire helpers: 8 orders with 1 / 2 / 4 / 8 helpers.'],
  ['Promising to chop later makes chopping faster', 'async makes CPU-heavy work faster', 'Busy hands: same time, plus a frozen door.'],
]

export function Misconceptions() {
  return (
    <section className="panel">
      <h2>Common mix-ups</h2>
      <ul className="myths">
        {MYTHS.map(([kitchen, tech, proof]) => (
          <li key={tech}>
            <div>
              <span className="myth">✗ “{kitchen}”</span>
              <span className="tech-term">“{tech}”</span>
            </div>
            <span className="why">See: {proof}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
