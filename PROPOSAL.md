# Upwork proposal — Ralph Loop MVP

_To be pasted into the Upwork proposal box. Do NOT submit without Cam's sign-off. Loom link is TODO — record before sending._

---

Hey — I read your brief and built the kernel instead of pitching one.

**Public repo:** https://github.com/camburley/ralph-mvp
**Live landing + demo:** https://ralph-mvp.vercel.app
**2-min Loom:** [TODO-loom-link]

It does exactly what you spec'd — Context Loading (real MCP filesystem server, not a fake file read), Plan / Execute / Observe / Self-correct, autonomous terminal loop, TypeScript + Node, ~550 LOC total (~150 in the loop core). The demo scenario is a broken vitest that the agent fixes without a human touching the keyboard: it runs the tests, sees them fail, reads the source, rewrites the buggy function, re-runs the tests, and signals `done` — end-to-end in 3 iterations.

The brain is a one-file `claude -p` shim — swap it for the Anthropic SDK, OpenAI, or a local model in an afternoon. The executor is an `execa` wrapper with an allowlist so the sandbox boundary is a config flag, not a rewrite. State is a `.ralph/state.json` ledger, so `ralph resume` picks up where a crashed run left off.

Before we fork it into your project, 6 Qs so I don't guess:

1. Target codebase / domain?
2. LLM provider — Claude-only or multi?
3. MCP servers needed beyond filesystem (git, HTTP, shell, custom)?
4. Success metric — % of tasks landed green without human edits?
5. Sandbox boundary — full shell or allowlisted commands?
6. OSS license / repo ownership?

Available to jump on a 20-min scope call today. Happy to start immediately once we lock scope.

— Cam
