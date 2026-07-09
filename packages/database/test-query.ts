/**
 * Manual smoke: TCP PrismaPg + account.findFirst.
 * Usage: DATABASE_URL=... pnpm exec tsx test-query.ts
 */
import { PrismaClient } from "./generated/client";
import { createPrismaPgAdapter } from "./create-pg-adapter";
import { keys } from "./keys";

async function test() {
  const connectionString = keys().DATABASE_URL;
  const adapter = createPrismaPgAdapter(connectionString);
  const database = new PrismaClient({ adapter });

  console.log("Testing warm query...");
  try {
    const account = await database.account.findFirst({
      where: { deletedAt: null },
      select: { id: true, slug: true },
    });
    console.log("OK first:", account?.slug ?? "(none)");

    // Prove idle reaping is not 10s: wait 15s then query again.
    console.log("Waiting 15s (v7 default idle was 10s)...");
    await new Promise((r) => setTimeout(r, 15_000));

    const again = await database.account.findFirst({
      where: { deletedAt: null },
      select: { id: true, slug: true },
    });
    console.log("OK after idle:", again?.slug ?? "(none)");
  } catch (error) {
    console.error("Error:", error);
    process.exitCode = 1;
  } finally {
    await database.$disconnect();
  }
}

void test();
