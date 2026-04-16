import { execa } from 'execa';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Action } from './brain.js';
import type { Observation } from './state.js';

const ALLOWLIST = ['npm', 'npx', 'node', 'git', 'ls', 'cat', 'tsx', 'vitest', 'pnpm', 'yarn', 'echo', 'mkdir', 'rm', 'cp', 'mv', 'grep', 'sed', 'awk', 'head', 'tail', 'wc', 'pwd', 'true', 'false', 'cd'];
const TIMEOUT_MS = 60_000;
const MAX_OUT = 6_000;

export async function execute(action: Action, cwd: string): Promise<Observation> {
  switch (action.type) {
    case 'shell':
      return runShell(action.cmd, cwd);
    case 'write_file':
      return writeToFile(action.path, action.content, cwd);
    case 'read_file':
      return readFromFile(action.path, cwd);
    case 'noop':
      return { ok: true, note: 'noop' };
  }
}

async function runShell(cmd: string, cwd: string): Promise<Observation> {
  const head = cmd.trim().split(/\s+/)[0] ?? '';
  if (!ALLOWLIST.includes(head)) {
    return {
      ok: false,
      note: `blocked: command "${head}" not in allowlist`,
      exitCode: -1,
    };
  }
  try {
    const { stdout, stderr, exitCode } = await execa(cmd, {
      cwd,
      shell: true,
      timeout: TIMEOUT_MS,
      reject: false,
      all: false,
    });
    return {
      ok: (exitCode ?? 0) === 0,
      stdout: clip(stdout),
      stderr: clip(stderr),
      exitCode: exitCode ?? -1,
    };
  } catch (err: unknown) {
    const e = err as { message?: string; exitCode?: number; stdout?: string; stderr?: string };
    return {
      ok: false,
      stdout: clip(e.stdout ?? ''),
      stderr: clip(e.stderr ?? e.message ?? 'unknown error'),
      exitCode: e.exitCode ?? -1,
    };
  }
}

async function writeToFile(rel: string, content: string, cwd: string): Promise<Observation> {
  const abs = path.resolve(cwd, rel);
  if (!abs.startsWith(path.resolve(cwd))) {
    return { ok: false, note: `blocked: write outside cwd (${rel})` };
  }
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, content, 'utf8');
  return { ok: true, note: `wrote ${content.length} bytes to ${rel}` };
}

async function readFromFile(rel: string, cwd: string): Promise<Observation> {
  const abs = path.resolve(cwd, rel);
  if (!abs.startsWith(path.resolve(cwd))) {
    return { ok: false, note: `blocked: read outside cwd (${rel})` };
  }
  try {
    const content = await readFile(abs, 'utf8');
    return { ok: true, stdout: clip(content), note: `read ${rel}` };
  } catch (err) {
    return { ok: false, stderr: String(err), note: `read failed ${rel}` };
  }
}

function clip(s: string): string {
  if (!s) return '';
  return s.length > MAX_OUT ? s.slice(0, MAX_OUT) + `\n…[truncated ${s.length - MAX_OUT}b]` : s;
}
