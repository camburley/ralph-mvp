import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { Plan } from './brain.js';

export interface Observation {
  ok: boolean;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  note?: string;
}

export interface HistoryEntry {
  iter: number;
  plan: Plan;
  obs: Observation;
  ts: string;
}

export interface State {
  goal: string;
  history: HistoryEntry[];
  done: boolean;
  createdAt: string;
  updatedAt: string;
}

const STATE_DIR = '.ralph';
const STATE_FILE = 'state.json';

export function statePath(cwd: string): string {
  return path.join(cwd, STATE_DIR, STATE_FILE);
}

export async function loadState(cwd: string, goal: string): Promise<State> {
  const p = statePath(cwd);
  if (existsSync(p)) {
    const raw = await readFile(p, 'utf8');
    try {
      const s = JSON.parse(raw) as State;
      return s;
    } catch {
      /* fall through to fresh */
    }
  }
  const now = new Date().toISOString();
  return {
    goal,
    history: [],
    done: false,
    createdAt: now,
    updatedAt: now,
  };
}

export async function saveState(cwd: string, state: State): Promise<void> {
  state.updatedAt = new Date().toISOString();
  const p = statePath(cwd);
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, JSON.stringify(state, null, 2), 'utf8');
}
