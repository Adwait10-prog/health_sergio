// create_asana_task + the pending "which project?" follow-up
import type { Handler } from "./types";
import type { Ctx } from "../context";
import { db } from "../../db";
import { createAsanaTaskFromWhatsApp, resolveProject } from "../../asanaWhatsapp";

export const createAsanaTask: Handler = async (ctx, parsed) => {
  const d = parsed.data;
  const taskDescription = d.taskDescription as string | null;
  if (!taskDescription) {
    await ctx.reply("What should the task be about? Give me a bit more detail and which project it's for.");
    return;
  }
  const result = await createAsanaTaskFromWhatsApp({
    taskTitle:    d.taskTitle    as string | null,
    taskDescription,
    projectHint:  d.projectHint  as string | null,
    sectionHint:  d.sectionHint  as string | null,
    assigneeHint: d.assigneeHint as string | null,
    phone: ctx.from,
  });
  await ctx.reply(result.message);
};

// Called before intent parsing. If an unexpired "which project?" question is open AND this
// message names a known project, finish the Asana task and return true. Anything else
// (e.g. "what are my tasks?") falls through to normal parsing; the question stays open until it expires.
export async function resolvePendingAsana(ctx: Ctx): Promise<boolean> {
  const pending = await db.whatsappPendingAction.findUnique({ where: { phone: ctx.from } });
  if (!pending || pending.action !== "create_asana_task") return false;

  if (new Date() >= pending.expiresAt) {
    await db.whatsappPendingAction.delete({ where: { phone: ctx.from } }).catch(() => {});
    return false;
  }
  if (!resolveProject(ctx.text.trim())) return false;

  const payload = JSON.parse(pending.payload) as {
    taskTitle: string | null; taskDescription: string; sectionHint: string | null; assigneeHint: string | null;
  };
  const result = await createAsanaTaskFromWhatsApp({
    taskTitle:    payload.taskTitle ?? null,
    taskDescription: payload.taskDescription,
    projectHint:  ctx.text.trim(),
    sectionHint:  payload.sectionHint ?? null,
    assigneeHint: payload.assigneeHint,
    phone: ctx.from,
    skipPendingCheck: true,
  });

  // Only clear the question once the ticket really exists
  if (result.created) await db.whatsappPendingAction.delete({ where: { phone: ctx.from } }).catch(() => {});
  await ctx.reply(result.message);
  return true;
}
