import { db } from "../src/lib/db";
async function main() {
  const acts = await db.stravaActivity.findMany({
    where: { userId: process.env.USER_ID! },
    orderBy: { date: "desc" },
    take: 7,
    select: { name: true, type: true, date: true }
  });
  for (const a of acts) {
    const utc = a.date.toISOString();
    const ist = new Date(a.date.getTime() + 5.5*60*60*1000).toISOString().split("T")[0];
    console.log(`${a.name} | type=${a.type} | UTC=${utc} | IST=${ist}`);
  }
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
