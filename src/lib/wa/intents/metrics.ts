// log_metric — "reliance 90", "demos 2", "ferritin 38"
import type { Handler } from "./types";
import { db } from "../../db";
import { OS } from "../../osData";
import { isMetricKey } from "../../metrics";
import { dayMonth } from "../../date";

const fmtDay = (d: Date) => dayMonth(new Date(d.getTime() + 5.5 * 60 * 60 * 1000));

export const logMetric: Handler = async (ctx, parsed) => {
  const key = String(parsed.data.key ?? "").toLowerCase().trim();
  const value = Number(parsed.data.value);
  if (!isMetricKey(key) || !Number.isFinite(value)) {
    await ctx.reply("Which number? Try \"reliance 90\", \"demos 2\" or \"ferritin 38\".");
    return;
  }

  const prev = await db.metric.findFirst({ where: { key, date: { lt: ctx.today } }, orderBy: { date: "desc" } });
  await db.metric.upsert({
    where: { key_date: { key, date: ctx.today } },
    create: { key, value, date: ctx.today },
    update: { value }, // re-logging the same day overwrites
  });

  const cfg = OS.numbers[key];
  const was = prev ? ` · was ${prev.value} on ${fmtDay(prev.date)}` : "";
  await ctx.reply(`✓ ${cfg.label} ${value} ${cfg.unit}${was}`);
};
