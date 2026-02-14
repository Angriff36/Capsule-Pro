/**
 * Seed script to populate units and waste reasons tables
 *
 * This script executes the seed data that was defined in the migration file.
 * Run with: npx tsx scripts/seed-units-waste-reasons.ts
 */

import "dotenv/config";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import { PrismaClient } from "../generated/client";

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

const prisma = new PrismaClient({
  adapter: new PrismaNeon({
    connectionString: process.env.DATABASE_URL!,
  }),
});

// Seed data definitions
const UNITS_DATA = [
  {
    id: 1,
    code: "g",
    name: "gram",
    name_plural: "grams",
    unit_system: "metric",
    unit_type: "weight",
    is_base_unit: false,
  },
  {
    id: 2,
    code: "kg",
    name: "kilogram",
    name_plural: "kilograms",
    unit_system: "metric",
    unit_type: "weight",
    is_base_unit: true,
  },
  {
    id: 3,
    code: "mg",
    name: "milligram",
    name_plural: "milligrams",
    unit_system: "metric",
    unit_type: "weight",
    is_base_unit: false,
  },
  {
    id: 4,
    code: "oz",
    name: "ounce",
    name_plural: "ounces",
    unit_system: "imperial",
    unit_type: "weight",
    is_base_unit: false,
  },
  {
    id: 5,
    code: "lb",
    name: "pound",
    name_plural: "pounds",
    unit_system: "imperial",
    unit_type: "weight",
    is_base_unit: true,
  },
  {
    id: 6,
    code: "t",
    name: "ton",
    name_plural: "tons",
    unit_system: "imperial",
    unit_type: "weight",
    is_base_unit: false,
  },
  {
    id: 10,
    code: "ml",
    name: "milliliter",
    name_plural: "milliliters",
    unit_system: "metric",
    unit_type: "volume",
    is_base_unit: false,
  },
  {
    id: 11,
    code: "l",
    name: "liter",
    name_plural: "liters",
    unit_system: "metric",
    unit_type: "volume",
    is_base_unit: true,
  },
  {
    id: 12,
    code: "floz",
    name: "fluid ounce",
    name_plural: "fluid ounces",
    unit_system: "imperial",
    unit_type: "volume",
    is_base_unit: false,
  },
  {
    id: 13,
    code: "cup",
    name: "cup",
    name_plural: "cups",
    unit_system: "imperial",
    unit_type: "volume",
    is_base_unit: false,
  },
  {
    id: 14,
    code: "pt",
    name: "pint",
    name_plural: "pints",
    unit_system: "imperial",
    unit_type: "volume",
    is_base_unit: false,
  },
  {
    id: 15,
    code: "qt",
    name: "quart",
    name_plural: "quarts",
    unit_system: "imperial",
    unit_type: "volume",
    is_base_unit: false,
  },
  {
    id: 16,
    code: "gal",
    name: "gallon",
    name_plural: "gallons",
    unit_system: "imperial",
    unit_type: "volume",
    is_base_unit: true,
  },
  {
    id: 20,
    code: "ea",
    name: "each",
    name_plural: "each",
    unit_system: "custom",
    unit_type: "count",
    is_base_unit: true,
  },
  {
    id: 21,
    code: "doz",
    name: "dozen",
    name_plural: "dozens",
    unit_system: "custom",
    unit_type: "count",
    is_base_unit: false,
  },
  {
    id: 22,
    code: "pcs",
    name: "piece",
    name_plural: "pieces",
    unit_system: "custom",
    unit_type: "count",
    is_base_unit: false,
  },
  {
    id: 30,
    code: "mm",
    name: "millimeter",
    name_plural: "millimeters",
    unit_system: "metric",
    unit_type: "length",
    is_base_unit: false,
  },
  {
    id: 31,
    code: "cm",
    name: "centimeter",
    name_plural: "centimeters",
    unit_system: "metric",
    unit_type: "length",
    is_base_unit: false,
  },
  {
    id: 32,
    code: "m",
    name: "meter",
    name_plural: "meters",
    unit_system: "metric",
    unit_type: "length",
    is_base_unit: true,
  },
  {
    id: 33,
    code: "in",
    name: "inch",
    name_plural: "inches",
    unit_system: "imperial",
    unit_type: "length",
    is_base_unit: false,
  },
  {
    id: 34,
    code: "ft",
    name: "foot",
    name_plural: "feet",
    unit_system: "imperial",
    unit_type: "length",
    is_base_unit: true,
  },
  {
    id: 40,
    code: "c",
    name: "celsius",
    name_plural: "celsius",
    unit_system: "metric",
    unit_type: "temperature",
    is_base_unit: true,
  },
  {
    id: 41,
    code: "f",
    name: "fahrenheit",
    name_plural: "fahrenheit",
    unit_system: "imperial",
    unit_type: "temperature",
    is_base_unit: true,
  },
  {
    id: 50,
    code: "s",
    name: "second",
    name_plural: "seconds",
    unit_system: "metric",
    unit_type: "time",
    is_base_unit: false,
  },
  {
    id: 51,
    code: "min",
    name: "minute",
    name_plural: "minutes",
    unit_system: "metric",
    unit_type: "time",
    is_base_unit: false,
  },
  {
    id: 52,
    code: "h",
    name: "hour",
    name_plural: "hours",
    unit_system: "metric",
    unit_type: "time",
    is_base_unit: false,
  },
  {
    id: 53,
    code: "d",
    name: "day",
    name_plural: "days",
    unit_system: "metric",
    unit_type: "time",
    is_base_unit: true,
  },
];

const UNIT_CONVERSIONS_DATA = [
  { from_unit_id: 1, to_unit_id: 2, multiplier: 0.001 }, // gram to kilogram
  { from_unit_id: 3, to_unit_id: 1, multiplier: 0.001 }, // milligram to gram
  { from_unit_id: 2, to_unit_id: 1, multiplier: 1000 }, // kilogram to gram
  { from_unit_id: 4, to_unit_id: 5, multiplier: 0.0625 }, // ounce to pound
  { from_unit_id: 5, to_unit_id: 4, multiplier: 16 }, // pound to ounce
  { from_unit_id: 1, to_unit_id: 4, multiplier: 0.035_274 }, // gram to ounce
  { from_unit_id: 4, to_unit_id: 1, multiplier: 28.3495 }, // ounce to gram
  { from_unit_id: 2, to_unit_id: 5, multiplier: 2.204_62 }, // kilogram to pound
  { from_unit_id: 5, to_unit_id: 2, multiplier: 0.453_592 }, // pound to kilogram
  { from_unit_id: 10, to_unit_id: 11, multiplier: 0.001 }, // milliliter to liter
  { from_unit_id: 11, to_unit_id: 10, multiplier: 1000 }, // liter to milliliter
  { from_unit_id: 12, to_unit_id: 16, multiplier: 0.007_812_5 }, // fluid ounce to gallon
  { from_unit_id: 13, to_unit_id: 12, multiplier: 8 }, // cup to fluid ounce
  { from_unit_id: 14, to_unit_id: 12, multiplier: 16 }, // pint to fluid ounce
  { from_unit_id: 15, to_unit_id: 12, multiplier: 32 }, // quart to fluid ounce
  { from_unit_id: 16, to_unit_id: 15, multiplier: 4 }, // gallon to quart
  { from_unit_id: 10, to_unit_id: 12, multiplier: 0.033_814 }, // milliliter to fluid ounce
  { from_unit_id: 12, to_unit_id: 10, multiplier: 29.5735 }, // fluid ounce to milliliter
  { from_unit_id: 11, to_unit_id: 16, multiplier: 0.264_172 }, // liter to gallon
  { from_unit_id: 16, to_unit_id: 11, multiplier: 3.785_41 }, // gallon to liter
];

const WASTE_REASONS_DATA = [
  {
    code: "spoiled",
    name: "Spoiled",
    description: "Food item spoiled due to age or improper storage",
    color_hex: "#ef4444",
    is_active: true,
  },
  {
    code: "expired",
    name: "Expired",
    description: "Food item passed its expiration date",
    color_hex: "#f97316",
    is_active: true,
  },
  {
    code: "burnt",
    name: "Burnt",
    description: "Food item was burnt during preparation",
    color_hex: "#eab308",
    is_active: true,
  },
  {
    code: "dropped",
    name: "Dropped",
    description: "Food item was dropped on the floor",
    color_hex: "#f59e0b",
    is_active: true,
  },
  {
    code: "overcooked",
    name: "Overcooked",
    description: "Food item was cooked too long",
    color_hex: "#84cc16",
    is_active: true,
  },
  {
    code: "undercooked",
    name: "Undercooked",
    description: "Food item was not cooked enough",
    color_hex: "#10b981",
    is_active: true,
  },
  {
    code: "contaminated",
    name: "Contaminated",
    description: "Food item was contaminated",
    color_hex: "#06b6d4",
    is_active: true,
  },
  {
    code: "portion_error",
    name: "Portion Error",
    description: "Incorrect portion size prepared",
    color_hex: "#0ea5e9",
    is_active: true,
  },
  {
    code: "quality_issue",
    name: "Quality Issue",
    description: "Food item did not meet quality standards",
    color_hex: "#6366f1",
    is_active: true,
  },
  {
    code: "other",
    name: "Other",
    description: "Other reason not specified",
    color_hex: "#8b5cf6",
    is_active: true,
  },
];

async function main() {
  console.log("Starting seed of units and waste reasons...");

  try {
    // Get existing units by code
    const existingUnits = await prisma.$queryRaw<
      Array<{ id: number; code: string }>
    >`
      SELECT id, code FROM "core"."units"
    `;
    const existingUnitCodes = new Set(existingUnits.map((u) => u.code));
    const existingUnitIds = new Set(existingUnits.map((u) => u.id));

    console.log(`Found ${existingUnits.length} existing units`);

    // Seed Units
    console.log("Seeding units...");
    let unitsInserted = 0;
    for (const unit of UNITS_DATA) {
      if (!(existingUnitCodes.has(unit.code) || existingUnitIds.has(unit.id))) {
        await prisma.$executeRaw`
          INSERT INTO "core"."units" ("id", "code", "name", "name_plural", "unit_system", "unit_type", "is_base_unit")
          VALUES (${unit.id}, ${unit.code}, ${unit.name}, ${unit.name_plural}, ${unit.unit_system}, ${unit.unit_type}, ${unit.is_base_unit})
        `;
        unitsInserted++;
      }
    }
    console.log(`✓ ${unitsInserted} new units seeded`);

    // Seed Unit Conversions
    console.log("Seeding unit conversions...");
    const existingConversions = await prisma.$queryRaw<
      Array<{ from_unit_id: number; to_unit_id: number }>
    >`
      SELECT from_unit_id, to_unit_id FROM "core"."unit_conversions"
    `;
    const existingConversionKeys = new Set(
      existingConversions.map((c) => `${c.from_unit_id}-${c.to_unit_id}`)
    );

    let conversionsInserted = 0;
    for (const conversion of UNIT_CONVERSIONS_DATA) {
      const key = `${conversion.from_unit_id}-${conversion.to_unit_id}`;
      if (!existingConversionKeys.has(key)) {
        await prisma.$executeRaw`
          INSERT INTO "core"."unit_conversions" ("from_unit_id", "to_unit_id", "multiplier")
          VALUES (${conversion.from_unit_id}, ${conversion.to_unit_id}, ${conversion.multiplier})
        `;
        conversionsInserted++;
      }
    }
    console.log(`✓ ${conversionsInserted} new unit conversions seeded`);

    // Seed Waste Reasons
    console.log("Seeding waste reasons...");
    let wasteReasonsInserted = 0;

    // Check if waste_reasons table exists first
    try {
      const existingWasteReasons = await prisma.$queryRaw<
        Array<{ code: string }>
      >`
        SELECT code FROM "core"."waste_reasons"
      `;
      const existingWasteReasonCodes = new Set(
        existingWasteReasons.map((wr) => wr.code)
      );
      console.log(
        `Found ${existingWasteReasons.length} existing waste reasons`
      );

      for (const wasteReason of WASTE_REASONS_DATA) {
        if (!existingWasteReasonCodes.has(wasteReason.code)) {
          await prisma.$executeRaw`
            INSERT INTO "core"."waste_reasons" ("code", "name", "description", "color_hex", "is_active")
            VALUES (${wasteReason.code}, ${wasteReason.name}, ${wasteReason.description}, ${wasteReason.color_hex}, ${wasteReason.is_active})
          `;
          wasteReasonsInserted++;
        }
      }
    } catch (error: unknown) {
      // Check if error is due to missing table
      const isMissingTableError =
        error instanceof Error &&
        "code" in error &&
        error.code === "P2010" &&
        "message" in error &&
        typeof error.message === "string" &&
        error.message.includes("does not exist");

      if (isMissingTableError) {
        // Table doesn't exist, skip waste reasons seeding
        console.log("⚠ Waste reasons table does not exist, skipping...");
      } else {
        throw error;
      }
    }
    console.log(`✓ ${wasteReasonsInserted} new waste reasons seeded`);

    console.log("\n✅ Seed completed successfully!");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
