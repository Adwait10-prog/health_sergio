import { db } from "./db";
import { getUserId } from "./user";

const JSON_BLOCK_RE = /```json\s*([\s\S]*?)```/;

export interface ParsedTask {
  title: string;
  section?: string;
  priority?: "high" | "medium" | "low";
}

export interface ClaudeResponse {
  today_tasks?: ParsedTask[];
  flags?: string[];
  habit_focus?: string;
  next_brief_in?: string;
}

export function parseClaudeResponse(raw: string): { json: ClaudeResponse | null; raw: string } {
  const m = raw.match(JSON_BLOCK_RE);
  if (!m) return { json: null, raw };
  try {
    return { json: JSON.parse(m[1]) as ClaudeResponse, raw };
  } catch {
    return { json: null, raw };
  }
}

const PRIORITY_MAP: Record<string, string> = { high: "high", medium: "medium", low: "low" };

export async function applyResponse(
  response: ClaudeResponse,
  raw: string,
): Promise<{ tasksCreated: number; flags: string[] }> {
  const userId = getUserId();
  let tasksCreated = 0;

  if (response.today_tasks?.length) {
    for (const t of response.today_tasks) {
      await db.task.create({
        data: {
          userId,
          title: t.title,
          section: t.section ?? "today",
          priority: PRIORITY_MAP[t.priority ?? "medium"] ?? 2,
          isToday: true,
          status: "active",
        },
      });
      tasksCreated++;
    }
  }

  await db.claudeAdjustment.create({
    data: {
      userId,
      briefSent: "",
      responseRaw: raw,
      responseJson: response ? JSON.stringify(response) : "",
      appliedChanges: JSON.stringify({ tasksCreated }),
    },
  });

  return { tasksCreated, flags: response.flags ?? [] };
}
