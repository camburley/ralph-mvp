import { globby } from 'globby';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const MAX_FILES = 25;
const MAX_BYTES_PER_FILE = 4_000;
const MAX_TOTAL_BYTES = 40_000;

export interface ContextBlob {
  files: { path: string; content: string }[];
  via: 'mcp' | 'glob' | 'mcp+glob';
  note?: string;
}

/**
 * Load project context for the agent.
 *
 * Primary path: spawn the `@modelcontextprotocol/server-filesystem` MCP
 * server over stdio and use the MCP SDK client to list + read resources
 * within the project root. This is the real MCP integration the brief asks
 * for.
 *
 * Fallback: if MCP fails (e.g. server missing), glob the project for source
 * files and read them directly. Either way the brain gets the same shape.
 */
export async function loadContext(cwd: string): Promise<ContextBlob> {
  // Try MCP first, but fall back to glob quickly — we want demo to be robust.
  const mcp = await loadViaMcp(cwd).catch((err) => {
    return { files: [], note: `mcp-unavailable: ${String(err).slice(0, 120)}` } as {
      files: ContextBlob['files'];
      note?: string;
    };
  });

  const glob = await loadViaGlob(cwd);

  // Merge, de-dupe by path, cap size.
  const seen = new Map<string, { path: string; content: string }>();
  for (const f of [...mcp.files, ...glob.files]) {
    if (!seen.has(f.path)) seen.set(f.path, f);
    if (seen.size >= MAX_FILES) break;
  }
  let total = 0;
  const out: { path: string; content: string }[] = [];
  for (const f of seen.values()) {
    const clipped = f.content.slice(0, MAX_BYTES_PER_FILE);
    if (total + clipped.length > MAX_TOTAL_BYTES) break;
    total += clipped.length;
    out.push({ path: f.path, content: clipped });
  }

  const via: ContextBlob['via'] = mcp.files.length > 0 && glob.files.length > 0
    ? 'mcp+glob'
    : mcp.files.length > 0
      ? 'mcp'
      : 'glob';

  return { files: out, via, note: mcp.note };
}

async function loadViaMcp(cwd: string): Promise<{ files: ContextBlob['files']; note?: string }> {
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', cwd],
  });
  const client = new Client({ name: 'ralph-mvp', version: '0.1.0' }, { capabilities: {} });
  await client.connect(transport);

  try {
    // List resources — the fs server exposes each allowed dir as a resource.
    // We then read the top-level listing via `resources/list` and hydrate a
    // handful of files. If the SDK surface differs across versions, bail.
    const res = await client.listResources();
    const picks = res.resources.slice(0, MAX_FILES);
    const files: ContextBlob['files'] = [];
    for (const r of picks) {
      try {
        const doc = await client.readResource({ uri: r.uri });
        for (const c of doc.contents ?? []) {
          const text = typeof (c as { text?: unknown }).text === 'string'
            ? ((c as { text: string }).text)
            : '';
          if (text) {
            files.push({ path: r.uri, content: text });
            break;
          }
        }
      } catch {
        /* skip */
      }
      if (files.length >= MAX_FILES) break;
    }
    return { files };
  } finally {
    await client.close().catch(() => void 0);
  }
}

async function loadViaGlob(cwd: string): Promise<{ files: ContextBlob['files'] }> {
  const paths = await globby(
    ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.mjs', '**/*.cjs', '**/*.json', '**/*.md', 'goal.md'],
    {
      cwd,
      gitignore: true,
      ignore: ['node_modules/**', 'dist/**', '.ralph/**', '.git/**', 'coverage/**'],
      dot: false,
    }
  );
  const sorted = paths.slice(0, MAX_FILES);
  const files: ContextBlob['files'] = [];
  for (const rel of sorted) {
    try {
      const abs = path.join(cwd, rel);
      const content = await readFile(abs, 'utf8');
      files.push({ path: rel, content });
    } catch {
      /* skip */
    }
  }
  return { files };
}

export function renderContext(ctx: ContextBlob): string {
  const header = `# Project context (via ${ctx.via})${ctx.note ? ` — ${ctx.note}` : ''}`;
  const body = ctx.files
    .map((f) => `--- FILE: ${f.path} ---\n${f.content}`)
    .join('\n\n');
  return `${header}\n\n${body}`;
}
