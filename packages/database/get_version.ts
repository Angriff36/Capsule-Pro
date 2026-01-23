import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import { PrismaClient } from "./generated/client";

neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });

const database = new PrismaClient({ adapter });

async function getVersion() {
  const result = await database.$queryRaw`SELECT version();`;
  console.log(result);
  await database.$disconnect();
}

getVersion().catch(console.error);