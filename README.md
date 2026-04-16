# ralph-mvp

**Terminal-based agentic coding loop — ~550 LOC total, ~150 LOC in the loop core.**
Built against the Upwork brief: _"Developer for Agentic Coding Loop: Open Source CLI Agent inspired by Rasmic's RALPH / Claude Code"_.

Moves AWAY from "chatting with code" and TOWARD an autonomous terminal loop that plans, executes, and self-corrects on real terminal feedback.

## The 5-phase loop

```
           ┌────────────────────────┐
           │  1. Context Loading    │  ← MCP filesystem server (real MCP)
           └───────────┬────────────┘
                       │
           ┌───────────▼────────────┐
           │  2. Plan               │  ← claude -p (swappable brain)
           └───────────┬────────────┘
                       │
           ┌───────────▼────────────┐
           │  3. Execute            │  ← allowlisted shell / write_file
           └───────────┬────────────┘
                       │
           ┌───────────▼────────────┐
           │  4. Observe            │  ← stdout/stderr/exitCode captured
           └───────────┬────────────┘
                       │
           ┌───────────▼────────────┐
           │  5. Self-correct       │  ← obs folds into next prompt
           └───────────┬────────────┘
                       │
                 loop until done=true
```

## Quickstart

```bash
git clone https://github.com/camburley/ralph-mvp
cd ralph-mvp
npm install
cd demo && npm install && cd ..
npx tsx src/index.ts run demo/goal.md --cwd demo
```

The demo ships a broken vitest (`add(a,b) => a + b - 1`). The agent:
1. runs `npm test` → red
2. reads `src/math.ts` → spots the `- 1`
3. rewrites the file
4. re-runs `npm test` → green
5. signals `done`

All on its own, in the terminal, with real MCP context and real shell observation.

## demo2 — harder scenario

`demo/` is a one-shot fix (single bug, 2-3 iterations). `demo2/` is the
multi-file, multi-iteration version: a tiny TypeScript config validator with
two planted bugs that are **not** revealed by the test failure messages. The
agent has to read the test file, the validator, and the type definitions to
deduce what "valid" actually means, then fix it — typically across 5-8
iterations.

```bash
cd demo2 && npm install && cd ..
npx tsx src/index.ts run demo2/goal.md --cwd demo2
```

Expected baseline before the agent runs: `cd demo2 && npm test` → **2 pass,
2 fail**. Success: all 4 green and a `fix: validator edge cases` commit.

## File map (matches the brief 1-for-1)

| Brief requirement                  | File(s)                     |
|------------------------------------|-----------------------------|
| Terminal CLI agent                 | `src/index.ts` (commander)  |
| Ralph loop (5 phases)              | `src/loop.ts`               |
| Context Loading via MCP            | `src/context.ts`            |
| Plan (LLM)                         | `src/brain.ts` (`claude -p`)|
| Execute (real shell feedback)      | `src/executor.ts`           |
| Self-correct (state history)       | `src/state.ts`              |
| Demo scenario (broken → green)     | `demo/`                     |
| MIT license                        | `LICENSE`                   |

## Design choices (and what's swappable)

- **Brain.** `brain.ts` shells out to `claude -p` with a pinned JSON schema. One file, ~40 LOC. Swap to Anthropic SDK, OpenAI, local llama, or any function-calling model by replacing this file only.
- **Context.** Real MCP client over stdio against `@modelcontextprotocol/server-filesystem`, with a glob fallback so the demo still runs if your MCP install is funky. Add `server-git`, `server-shell`, or your own MCP server in one call.
- **Executor.** `execa` + an allowlist (`npm`, `git`, `node`, `tsx`, `vitest`, …). Tighten the allowlist for prod. Sandbox boundary is a config flag, not a rewrite.
- **State.** `.ralph/state.json` — plain JSON ledger of every `(plan, obs)` tuple. `ralph resume <goal>` picks up where you left off.

## CLI

```bash
ralph-mvp run <goal.md> [--cwd <dir>] [--max <n>]
ralph-mvp resume <goal.md> [--cwd <dir>]
ralph-mvp status [--cwd <dir>]
```

## Requirements

- Node 18+
- `claude` CLI on `$PATH` (Anthropic Claude Code). `RALPH_MODEL=sonnet` by default — override with any model your CLI supports.
- Authenticated `claude` session.

## Open questions for the client

See [`OPEN_QUESTIONS.md`](./OPEN_QUESTIONS.md) — 6 discovery questions I'd want answered before we fork this into your production project.

## License

MIT. Fork it, rename it, ship it.
