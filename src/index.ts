#!/usr/bin/env node
import { Command } from 'commander';
import path from 'node:path';
import { runLoop } from './loop.js';
import { loadState, statePath } from './state.js';

const program = new Command();

program
  .name('ralph-mvp')
  .description('Terminal-based agentic coding loop — Context → Plan → Execute → Observe → Self-correct')
  .version('0.1.0');

program
  .command('run <goalFile>')
  .description('Run the Ralph loop against a goal file')
  .option('--cwd <dir>', 'working directory for the loop (default: dir of goal file)')
  .option('--max <n>', 'max iterations', (v) => parseInt(v, 10), 12)
  .action(async (goalFile: string, opts: { cwd?: string; max: number }) => {
    const goalPath = path.resolve(goalFile);
    const cwd = path.resolve(opts.cwd ?? path.dirname(goalPath));
    console.log(`🤖 ralph-mvp  goal=${goalPath}  cwd=${cwd}  max=${opts.max}`);
    const state = await runLoop({ goalPath, cwd, maxIter: opts.max });
    console.log(`\n📝 state: ${statePath(cwd)}`);
    process.exit(state.done ? 0 : 1);
  });

program
  .command('resume <goalFile>')
  .description('Resume an in-progress loop (same semantics — state is auto-loaded)')
  .option('--cwd <dir>', 'working directory for the loop (default: dir of goal file)')
  .option('--max <n>', 'max iterations', (v) => parseInt(v, 10), 12)
  .action(async (goalFile: string, opts: { cwd?: string; max: number }) => {
    const goalPath = path.resolve(goalFile);
    const cwd = path.resolve(opts.cwd ?? path.dirname(goalPath));
    const existing = await loadState(cwd, '');
    console.log(`↩️  resuming  iters=${existing.history.length}  done=${existing.done}`);
    const state = await runLoop({ goalPath, cwd, maxIter: opts.max });
    process.exit(state.done ? 0 : 1);
  });

program
  .command('status')
  .description('Print current state summary')
  .option('--cwd <dir>', 'working directory', process.cwd())
  .action(async (opts: { cwd: string }) => {
    const cwd = path.resolve(opts.cwd);
    const s = await loadState(cwd, '');
    console.log(JSON.stringify({ done: s.done, iters: s.history.length, updatedAt: s.updatedAt }, null, 2));
  });

program.parseAsync(process.argv).catch((err) => {
  console.error('fatal:', err);
  process.exit(1);
});
