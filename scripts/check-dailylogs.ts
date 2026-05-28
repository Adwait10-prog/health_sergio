import { db } from "../src/lib/db";
async function main() {
  const logs = await db.dailyLog.findMany({
    where: { userId: process.env.USER_ID! },
    orderBy: { date: "desc" },
    take: 7,
    select: { date: true, didWorkout: true, didJournal: true, didCode: true }
  });
  for (const l of logs) {
    const ist = new Date(l.date.getTime() + 5.5*60*60*1000).toISOString().split("T")[0];
    console.log(`IST=${ist} | workout=${l.didWorkout} | journal=${l.didJournal} | code=${l.didCode}`);
  }
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
