import { db } from "../src/lib/db";
async function main() {
  // Check what the page sees for today's workout
  const today = new Date('2026-05-28T00:00:00.000Z'); // Vercel UTC today
  const last7 = new Date('2026-05-21T00:00:00.000Z');
  
  const strava = await db.stravaActivity.findMany({
    where: { userId: process.env.USER_ID!, date: { gte: last7 } },
    orderBy: { date: "desc" },
    select: { name: true, type: true, date: true }
  });
  
  console.log("All strava in last 7 days:");
  for (const a of strava) {
    const y = a.date.getFullYear();
    const m = String(a.date.getMonth()+1).padStart(2,"0");
    const d = String(a.date.getDate()).padStart(2,"0");
    console.log(`localKey=${y}-${m}-${d} | UTC=${a.date.toISOString()} | ${a.name} | ${a.type}`);
  }
  
  // Simulate what the page does
  function localKey(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
  
  console.log("\nDate map keys for this week:");
  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getTime() - i * 864e5);
    console.log(`i=${i} key=${localKey(d)}`);
  }
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
