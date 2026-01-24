import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "./generated/prisma";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
async function main() {
  try {
    console.log("🚀 Performing CRUD operations...");
    // CREATE
    const newUser = await prisma.user.create({
      data: { name: "Alice", email: `alice-${Date.now()}@prisma.io` },
    });
    console.log("✅ CREATE: New user created:", newUser);
    // READ
    const foundUser = await prisma.user.findUnique({
      where: { id: newUser.id },
    });
    console.log("✅ READ: Found user:", foundUser);
    // UPDATE
    const updatedUser = await prisma.user.update({
      where: { id: newUser.id },
      data: { name: "Alice Smith" },
    });
    console.log("✅ UPDATE: User updated:", updatedUser);
    // DELETE
    await prisma.user.delete({ where: { id: newUser.id } });
    console.log("✅ DELETE: User deleted.");
    console.log("\nCRUD operations completed successfully.");
  } catch (error) {
    console.error("❌ Error performing CRUD operations:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}
main();
