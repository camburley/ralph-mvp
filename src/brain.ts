import { execa } from 'execa';
import { z } from 'zod';

export const ActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('shell'), cmd: z.string() }),
  z.object({ type: z.literal('write_file'), path: z.string(), content: z.string() }),
  z.object({ type: z.literal('read_file'), path: z.string() }),
  z.object({ type: z.literal('noop') }),
]);

export const PlanSchema = z.object({
  thought: z.string(),
  action: ActionSchema,
  done: z.boolean().default(false),
});
export type Plan = z.infer<typeof PlanSchema>;
export type Action = z.infer<typeof ActionSchema>;

const SYSTEM = `You are Ralph, a terminal coding agent. You run in a strict loop:
Context → Plan → Execute → Observe → Self-correct.

You must ALWAYS respond with a single JSON object — no prose, no markdown fences — matching this schema:
{
  "thought": "one short sentence about what you're doing",
  "action": { "type": "shell", "cmd": "..." }
           | { "type": "write_file", "path": "...", "content": "..." }
           | { "type": "read_file", "path": "..." }
           | { "type": "noop" },
  "done": false
}

Rules:
- Pick ONE action per step. Keep cmds short.
- Prefer shell for running tests, installs, git.
- Prefer write_file to edit source; include the FULL file content in "content".
- Set "done": true only when the goal is fully satisfied and evidence is in history.
- Never include commentary outside the JSON.`;

export async function brain(prompt: string, opts: { model?: string; timeoutMs?: number } = {}): Promise<Plan> {
  const model = opts.model ?? process.env.RALPH_MODEL ?? 'sonnet';
  const timeoutMs = opts.timeoutMs ?? 120_000;

  const full = `${SYSTEM}\n\n---\n\n${prompt}\n\nReturn ONLY the JSON object.`;

  const { stdout } = await execa('claude', ['-p', full, '--model', model, '--output-format', 'text'], {
    timeout: timeoutMs,
    reject: true,
  });

  const raw = stripFences(stdout.trim());
  const parsed = safeParseJson(raw);
  return PlanSchema.parse(parsed);
}

function stripFences(s: string): string {
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  return s;
}

function safeParseJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    // attempt to locate the first JSON object in the string
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const slice = s.slice(start, end + 1);
      return JSON.parse(slice);
    }
    throw new Error(`brain returned non-JSON:\n${s.slice(0, 500)}`);
  }
}
