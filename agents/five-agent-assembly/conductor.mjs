// JEV Engineering: the conductor.
// Each agent declares the files it needs and the files it produces. The
// conductor starts an agent the moment every file it needs exists, so agents
// whose inputs are ready run side by side instead of waiting their turn.
import { EventEmitter } from 'node:events'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'

export class Conductor extends EventEmitter {
  constructor(outDir, { log = console.log } = {}) {
    super()
    this.outDir = outDir
    this.log = log
    this.files = new Map() // relative path -> contents
    this.tasks = []
    this.timings = {} // name -> { start, end }
    this.ledger = [] // { agent, model, usage, usd, batch }
    this.fileTimes = {} // relative path -> ms since run() started
    this.t0 = Date.now()
  }

  add(task) {
    this.tasks.push({ needs: [], ...task, state: 'waiting' })
    return this
  }

  has(file) {
    return this.files.has(file)
  }

  read(file) {
    if (!this.files.has(file)) throw new Error(`${file} has not been produced yet`)
    return this.files.get(file)
  }

  // Agents call this. Writing a file is what wakes the agents that need it.
  async write(file, contents) {
    const abs = path.join(this.outDir, file)
    await mkdir(path.dirname(abs), { recursive: true })
    await writeFile(abs, contents)
    this.files.set(file, contents)
    this.fileTimes[file] = Date.now() - this.t0
    this.log(`  [jev] ${file} ready`)
    this.emit('file', file)
  }

  // Seed files that already exist on disk (for resuming a run).
  async load(file) {
    this.files.set(file, await readFile(path.join(this.outDir, file), 'utf8'))
  }

  record(entry) {
    this.ledger.push(entry)
  }

  run() {
    return new Promise((resolve, reject) => {
      const names = new Set(this.tasks.map((t) => t.name))
      if (names.size !== this.tasks.length) throw new Error('task names must be unique')
      const producible = new Set([...this.files.keys(), ...this.tasks.flatMap((t) => t.produces || [])])
      for (const t of this.tasks) {
        const missing = t.needs.filter((f) => !producible.has(f))
        if (missing.length) throw new Error(`${t.name} needs ${missing.join(', ')}, which no agent produces`)
      }

      let running = 0
      let failed = false
      const t0 = (this.t0 = Date.now())

      const tryStart = () => {
        for (const t of this.tasks) {
          if (failed || t.state !== 'waiting' || !t.needs.every((f) => this.has(f))) continue
          t.state = 'running'
          running++
          this.timings[t.name] = { start: Date.now() - t0 }
          this.log(`▶ ${t.name} started (${(this.timings[t.name].start / 1000).toFixed(1)}s)`)
          Promise.resolve()
            .then(() => t.run(this))
            .then(() => {
              for (const f of t.produces || []) {
                if (!this.has(f)) throw new Error(`${t.name} finished without producing ${f}`)
              }
              t.state = 'done'
              this.timings[t.name].end = Date.now() - t0
              this.log(`✔ ${t.name} done (${(this.timings[t.name].end / 1000).toFixed(1)}s)`)
            })
            .catch((err) => {
              t.state = 'failed'
              failed = true
              this.timings[t.name].end = Date.now() - t0
              reject(Object.assign(err, { agent: t.name }))
            })
            .finally(() => {
              running--
              if (failed) return
              tryStart()
              if (running === 0) finish()
            })
        }
      }

      const finish = () => {
        const stuck = this.tasks.filter((t) => t.state === 'waiting')
        if (stuck.length) return reject(new Error(`never started: ${stuck.map((t) => t.name).join(', ')}`))
        resolve(this.summary(Date.now() - t0))
      }

      this.on('file', tryStart)
      tryStart()
      if (running === 0) finish()
    })
  }

  summary(wallMs) {
    const serialMs = Object.values(this.timings).reduce((s, t) => s + (t.end - t.start), 0)
    const costs = this.ledger.map((e) => e.usd)
    return {
      wallMs,
      serialMs, // what the same agent durations would take back to back
      timings: this.timings,
      fileTimes: this.fileTimes,
      ledger: this.ledger,
      totalUsd: costs.some((c) => c == null) ? null : costs.reduce((a, b) => a + b, 0),
    }
  }
}
