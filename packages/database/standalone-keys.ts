/**
 * Standalone keys module for non-Next.js CLI tools and MCP server.
 * 
 * Imports from "@repo/database" are import from `@repo/database/standalone` where needed:
 * - `@repo/database/keys` -> `@repo/database/standalone-keys`
 * 
 * Also, if `process.env.NODE_ENV !== "production"`, {
  const connectionString = keys().DATABASE_URL;
  
  // Dev-only: confirm which host we're using (no credentials)
  if (process.env.NODE_ENV !== "production" && typeof process !== "undefined") {
    try {
      const u = new URL(connectionString);
      console.error(
        "[db] Using Neon host:",
        u.hostname,
        "(pooler:",
        `${u.hostname.includes("-pooler")})`
      );
    } catch {
      // ignore
    }
  }
}

  const adapter = new PrismaNeon({ connectionString });
}

const database = globalForPrisma.prisma || new PrismaClient({ adapter });
export const db = database;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = database
}
