import { db } from "@/lib/db";
import { OS } from "@/lib/osData";
import { istToday, computeMode, daysUntil, countdownTone, currentBlockWeek } from "@/lib/osLogic";
import { dayMonth } from "@/lib/date";
import OsBoard, { type CountdownView } from "@/components/os/OsBoard";

export const dynamic = "force-dynamic";

export default async function OsPage() {
  const today = istToday();

  const [items, note] = await Promise.all([
    db.osChecklistItem.findMany({ where: { done: true } }),
    db.osNote.findUnique({ where: { key: "three" } }),
  ]);

  const doneMap: { open: Record<string, boolean>; ftm: Record<string, boolean> } = { open: {}, ftm: {} };
  for (const it of items) {
    if (it.listKey === "open" || it.listKey === "ftm") doneMap[it.listKey][it.itemId] = true;
  }

  const countdowns: CountdownView[] = OS.countdowns.map(c => {
    const days = c.date ? daysUntil(c.date, today) : null;
    return { ...c, days, tone: days == null ? "soon" : countdownTone(days), when: c.date ? dayMonth(c.date) : c.text ?? "" };
  });

  const separationDone = OS.separation.filter(s => s.status === "done").length;

  return (
    <OsBoard
      todayLabel={`${today.toUTCString().slice(0, 3)} ${dayMonth(today)} ${today.getUTCFullYear()}`}
      mode={computeMode(today)}
      countdowns={countdowns}
      separationDone={separationDone}
      separationTotal={OS.separation.length}
      slamPct={Math.round((100 * OS.slamSpent) / OS.slamTotal)}
      slamRemaining={OS.slamTotal - OS.slamSpent}
      block={currentBlockWeek(today)}
      threeText={note?.text ?? ""}
      doneMap={doneMap}
    />
  );
}
