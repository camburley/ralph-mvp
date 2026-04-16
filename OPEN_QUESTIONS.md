# Open questions for the client

Before forking `ralph-mvp` into your production project, these 6 questions decide the architecture. None of them is hard to answer — they just lock the scope so I don't guess.

1. **Target codebase / domain.**
   What's the actual codebase the agent will operate on? (language stack, repo size, monorepo or not, any domain quirks — e.g. infra scripts, a React app, a Rust service.)

2. **LLM provider(s).**
   Claude-only via Claude Code, or multi-provider (OpenAI, local llama, Bedrock, Azure)? If multi, do you want a single `brain.ts` abstraction or parallel brains for different tasks?

3. **MCP servers beyond filesystem.**
   The MVP uses `server-filesystem`. Do you also need `server-git`, an HTTP MCP, a shell MCP, or a custom MCP (e.g. your internal API)? Knowing this up-front prevents a context rewrite later.

4. **Success metric.**
   How do you measure success? (% of tasks landed green without human edit? mean iterations to done? time-to-green? cost-per-task?) I'll wire the ledger + evals to whatever metric you care about.

5. **Sandbox boundary.**
   Full shell or strict allowlist? Any commands that must be banned (e.g. `rm -rf`, `curl`, `git push`)? Docker isolation? Network on/off by default? This is the single biggest safety lever.

6. **OSS license / repo ownership / namespace.**
   MIT like this MVP, or something else? Who owns the repo (your GH org, mine, neutral)? npm package name? This matters for branding and for how aggressively I can borrow from upstream Ralph-style projects.
