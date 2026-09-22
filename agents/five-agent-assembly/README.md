# Five-agent assembly

Five Claude agents take a product idea and turn it into a brief, a spec, code, tests and a launch plan. **JEV Engineering** is the conductor. It starts each agent as soon as the files that agent needs exist.

```
scout ──brief.md──▶ architect ──spec.md──┬──▶ builder  → src/
  (Haiku 4.5)          (Opus 5)          ├──▶ tester   → tests/     (runs alongside builder)
                                         └──▶ shipper  → launch.md  (also needs brief.md)
```

| Agent | Pinned model | How it's called |
|---|---|---|
| scout | `claude-haiku-4-5-20251001` | Messages API, optional web search (`--web`) |
| architect | `claude-opus-5` | Streaming, adaptive thinking, server-side refusal fallback (`fallbacks: "default"`) |
| builder | `claude-sonnet-5` | Streaming, adaptive thinking |
| tester | `claude-sonnet-5` | Streaming, adaptive thinking. Writes tests from the spec only, never sees the code |
| shipper | `claude-haiku-4-5-20251001` | Message Batches API, 50% of list price |

The model IDs are set in `models.mjs`, and the SDK version is pinned exactly in `package.json`.

## Run

```bash
cd agents/five-agent-assembly
npm install
export ANTHROPIC_API_KEY=...        # or `ant auth login`
node run.mjs "invoice reminders for freelancers" --out ./out --verify
```

Flags: `--web` lets the scout search the web and cite URLs. `--no-batch` runs the shipper synchronously. `--verify` runs the generated tests against the generated code.

If the shipper's batch is still running when the 60-minute wait ends, collect it later with `node run.mjs collect ./out`.

Each run writes `out/report.md`, which contains:
- the time each agent started and finished
- the wall-clock time compared with running the same agents one after another
- token usage and USD cost per agent, calculated from the API's `usage` fields
- the result of the test run

`npm test` checks the conductor itself. It needs no API key.

## What this does and doesn't do

- **The agents are not free.** Each run makes paid API calls. `report.md` shows the cost at the list prices in `models.mjs`. Your Anthropic invoice is the final figure.
- **Only the last three agents run in parallel.** The architect needs the scout's brief, and the other three need the architect's spec, so those first two steps always run in order. Builder, tester and shipper then run at the same time. Measure the time saved with `report.md`. It depends on your idea and on API latency. No particular figure (such as "15 minutes instead of 26") is guaranteed.
- **Batch can be the slowest step.** A batch costs half as much, but the API only promises results within 24 hours; most batches finish within an hour. Use `--no-batch` if total run time matters more than the shipper's cost.
- **Paying customers start at 0.** The scorecard in `report.md` always lists paying customers as 0. Revenue has to come from selling the product.
- **The generated code needs review.** The tester writes tests from the spec, and `--verify` checks that they pass against the builder's code. Passing tests are not a security or production review.
