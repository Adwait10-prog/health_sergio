import { db } from "../src/lib/db";

async function main() {
  const updated = await db.task.updateMany({
    where: { title: { contains: "Aryan" } },
    data: { dueDate: null },
  });
  console.log("Cleared bad dueDate:", updated.count);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
