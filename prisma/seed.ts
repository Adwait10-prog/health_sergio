import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" });
const db = new PrismaClient({ adapter } as any);

async function main() {
  const user = await db.user.upsert({
    where: { email: "aryantiwari1166@gmail.com" },
    update: {},
    create: {
      email: "aryantiwari1166@gmail.com",
      name: "Adwait",
    },
  });
  console.log(`Seeded user: ${user.email} (${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
