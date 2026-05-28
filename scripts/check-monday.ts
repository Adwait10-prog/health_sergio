import { db } from "../src/lib/db";
async function main() {
  // Check if Monday May 25 has a DailyLog row
  const logs = await db.dailyLog.findMany({
    where: { userId: process.env.USER_ID! },
    orderBy: { date: "asc" },
    select: { date: true, didWorkout: true }
  });
  for (const l of logs) {
    console.log(`UTC=${l.date.toISOString()} | workout=${l.didWorkout}`);
  }
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
