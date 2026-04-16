import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { brain, type Plan } from './brain.js';
import { loadContext, renderContext } from './context.js';
import { execute } from './executor.js';
import { loadState, saveState, type HistoryEntry, type Observation, type State } from './state.js';

export interface LoopOpts {
  goalPath: string;
  cwd: string;
  maxIter?: number;
  onStep?: (entry: HistoryEntry) => void;
}

const DEFAULT_MAX = 12;

export async function runLoop(opts: LoopOpts): Promise<State> {
  const { goalPath, cwd } = opts;
  const maxIter = opts.maxIter ?? DEFAULT_MAX;
  const goal = await readFile(path.resolve(goalPath), 'utf8');
  const state = await loadState(cwd, goal);
  state.goal = goal;

  while (!state.done && state.history.length < maxIter) {
    const iter = state.history.length + 1;
    process.stdout.write(`\n▸ iter ${iter}  [Context Loading]\n`);
    const ctx = await loadContext(cwd);
    process.stdout.write(`  context via ${ctx.via}, ${ctx.files.length} files\n`);

    const prompt = buildPrompt(goal, state, ctx, iter, maxIter);
    process.stdout.write(`  [Plan]  asking brain...\n`);
    let plan: Plan;
    try {
      plan = await brain(prompt);
    } catch (err) {
      const entry: HistoryEntry = {
        iter,
        plan: { thought: `brain error: ${String(err).slice(0, 200)}`, action: { type: 'noop' }, done: false },
        obs: { ok: false, note: 'brain-error' },
        ts: new Date().toISOString(),
      };
      state.history.push(entry);
      opts.onStep?.(entry);
      await saveState(cwd, state);
      break;
    }

    process.stdout.write(`  thought: ${plan.thought}\n`);
    process.stdout.write(`  action : ${renderAction(plan)}\n`);

    if (plan.done) {
      process.stdout.write(`  [Done]  agent signaled completion.\n`);
      state.done = true;
      const entry: HistoryEntry = {
        iter,
        plan,
        obs: { ok: true, note: 'done' },
        ts: new Date().toISOString(),
      };
      state.history.push(entry);
      opts.onStep?.(entry);
      await saveState(cwd, state);
      break;
    }

    process.stdout.write(`  [Execute]\n`);
    const obs = await execute(plan.action, cwd);
    process.stdout.write(`  [Observe] ok=${obs.ok} exit=${obs.exitCode ?? '-'}${obs.note ? ` note="${obs.note}"` : ''}\n`);
    const preview = (obs.stdout ?? obs.stderr ?? '').split('\n').slice(0, 6).join('\n    ');
    if (preview) process.stdout.write(`    ${preview}\n`);

    const entry: HistoryEntry = { iter, plan, obs, ts: new Date().toISOString() };
    state.history.push(entry);
    opts.onStep?.(entry);
    await saveState(cwd, state);
    process.stdout.write(`  [Self-correct] (feedback folds into next iter)\n`);
  }

  if (!state.done) {
    process.stdout.write(`\n⏹  max iterations (${maxIter}) reached without done=true.\n`);
  } else {
    process.stdout.write(`\n✅  goal achieved in ${state.history.length} iterations.\n`);
  }

  return state;
}

function renderAction(plan: Plan): string {
  const a = plan.action;
  switch (a.type) {
    case 'shell':
      return `shell: ${a.cmd}`;
    case 'write_file':
      return `write_file: ${a.path} (${a.content.length}b)`;
    case 'read_file':
      return `read_file: ${a.path}`;
    case 'noop':
      return 'noop';
  }
}

function buildPrompt(
  goal: string,
  state: State,
  ctx: Awaited<ReturnType<typeof loadContext>>,
  iter: number,
  maxIter: number
): string {
  const ctxText = renderContext(ctx);
  const history = state.history
    .map((h) => {
      const a = h.plan.action;
      const action =
        a.type === 'shell'
          ? `shell \`${a.cmd}\``
          : a.type === 'write_file'
            ? `write_file ${a.path}`
            : a.type === 'read_file'
              ? `read_file ${a.path}`
              : 'noop';
      const obs = summarizeObs(h.obs);
      return `iter ${h.iter}: ${h.plan.thought}\n  action: ${action}\n  obs: ${obs}`;
    })
    .join('\n\n');

  return `# Goal
${goal.trim()}

# Iteration
${iter} of ${maxIter}

# History
${history || '(none yet — this is the first iteration)'}

# ${ctxText}

# Instructions
Decide the single best next step to make progress on the goal.
Respond with ONLY the JSON object per the schema.`;
}

function summarizeObs(obs: Observation): string {
  const parts: string[] = [];
  parts.push(`ok=${obs.ok}`);
  if (obs.exitCode !== undefined) parts.push(`exit=${obs.exitCode}`);
  if (obs.note) parts.push(`note=${obs.note}`);
  const tail = (obs.stdout ?? '') + (obs.stderr ? `\nSTDERR:\n${obs.stderr}` : '');
  if (tail.trim()) {
    const clipped = tail.length > 1200 ? tail.slice(-1200) + '\n…[clipped]' : tail;
    parts.push(`out=\n${clipped}`);
  }
  return parts.join(' ');
}
