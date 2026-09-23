// add_task · query_tasks · complete_task
import type { Handler } from "./types";
import { db } from "../../db";
import { createCalendarEvent } from "../../googleCalendar";

export const addTask: Handler = async (ctx, parsed) => {
  const d = parsed.data;
  const title    = d.title    as string;
  const priority = (d.priority as string) || "medium";
  const section  = (d.section  as string) || "work";
  const time     = d.time as string | null | undefined;

  // Always use server-side date — never trust the parser for dates
  await db.task.create({
    data: { userId: ctx.userId, title, priority, section, status: "todo", isToday: true, dueDate: ctx.today },
  });

  // If a time was mentioned, also create a Google Calendar event
  let calendarNote = "";
  if (time) {
    const link = await createCalendarEvent({ title, date: ctx.today, timeStr: time, reminderMinutes: 60 });
    calendarNote = link
      ? `\n📅 Calendar event created for ${time} (1hr reminder set)`
      : `\n⚠️ Task saved but couldn't create calendar event`;
  }

  await ctx.reply((parsed.reply || `✅ Added: ${title}`) + calendarNote);
};

export const queryTasks: Handler = async (ctx, parsed) => {
  const filter = parsed.data.filter as string ?? "today";

  const tasks = await db.task.findMany({
    where: {
      userId: ctx.userId,
      status: { in: ["todo", "in_progress"] },
      ...(filter === "high" && { priority: "high" }),
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    take: 15,
    select: { title: true, priority: true, section: true, dueDate: true, status: true },
  });

  if (tasks.length === 0) {
    await ctx.reply("No open tasks right now 🎉 You're all clear!");
    return;
  }

  const high   = tasks.filter(t => t.priority === "high");
  const medium = tasks.filter(t => t.priority === "medium");
  const low    = tasks.filter(t => t.priority === "low");

  let reply = `📋 Your open tasks (${tasks.length}):\n`;
  if (high.length)   reply += `\n🔴 High\n${high.map(t => `• ${t.title}`).join("\n")}`;
  if (medium.length) reply += `\n🟡 Medium\n${medium.map(t => `• ${t.title}`).join("\n")}`;
  if (low.length)    reply += `\n⚪ Low\n${low.map(t => `• ${t.title}`).join("\n")}`;

  await ctx.reply(reply.trim());
};

const STOP_WORDS = new Set(["the", "a", "an", "is", "are", "was", "on", "in", "at", "to", "for", "of", "and", "or", "from", "with", "task", "completed", "done", "finish", "finished"]);

export const completeTask: Handler = async (ctx, parsed) => {
  const keyword = (parsed.data.keyword as string ?? "").toLowerCase().trim();
  if (!keyword) {
    await ctx.reply("Which task did you complete? Be a bit more specific 🙂");
    return;
  }

  const tasks = await db.task.findMany({
    where: { userId: ctx.userId, status: { in: ["todo", "in_progress"] } },
    select: { id: true, title: true },
  });

  // Exact phrase match wins; otherwise score by keyword overlap
  const words = keyword.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
  const match = tasks
    .map(t => {
      const title = t.title.toLowerCase();
      if (title.includes(keyword)) return { task: t, score: 100 };
      return { task: t, score: words.filter(w => title.includes(w)).length };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.task;

  if (!match) {
    await ctx.reply(`Couldn't find a task matching "${keyword}". Try "what are my tasks?" to see the list.`);
    return;
  }

  await db.task.update({ where: { id: match.id }, data: { status: "done", doneAt: new Date() } });
  await ctx.reply(parsed.reply || `✅ Done! "${match.title}" marked as complete.`);
};
