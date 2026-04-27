import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import { PrismaClient } from "./generated/client";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL env var is required");
}

async function test() {
  const neonConfig = { webSocketConstructor: ws, poolQueryViaFetch: true };
  const adapter = new PrismaNeon({ connectionString: DATABASE_URL });
  const database = new PrismaClient({ adapter });
  
  console.log("Testing...");
  try {
    const accounts = await database.account.findMany({ take: 1 });
    console.log("Accounts count:", accounts.length);
    
    if (accounts.length > 0) {
      const tenantId = accounts[0].id;
      console.log("Testing inventory for tenant:", tenantId);
      
      const items = await database.inventoryItem.findMany({
        where: { tenantId, deletedAt: null },
        take: 5,
      });
      console.log("Items count:", items.length);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await database.$disconnect();
  }
}

test();
