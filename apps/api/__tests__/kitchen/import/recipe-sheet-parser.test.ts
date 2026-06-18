import { describe, expect, it } from "vitest";
import { parseDurationToMinutes } from "@/app/api/kitchen/import/lib/duration-parse";
import { parseQuantityText } from "@/app/api/kitchen/import/lib/quantity-parse";
import {
  isRecipeSheetFormat,
  parseRecipeSheets,
} from "@/app/api/kitchen/import/lib/recipe-sheet-parser";
import { parseCsv } from "@/app/api/kitchen/import/lib/csv";

describe("recipe sheet quantity and duration parsing", () => {
  it("parses kitchen duration strings", () => {
    expect(parseDurationToMinutes("20 MINUTES")).toBe(20);
    expect(parseDurationToMinutes("1 HOUR")).toBe(60);
    expect(parseDurationToMinutes("1 HOUR 20 MINUTES")).toBe(80);
  });

  it("parses fractional and compound quantities", () => {
    expect(parseQuantityText("5 POUNDS")).toEqual({
      quantity: 5,
      unit: "POUNDS",
      description: "5 POUNDS",
    });
    expect(parseQuantityText("1/2 CUP").quantity).toBe(0.5);
    expect(parseQuantityText("6 #10 CANS").unit).toBe("#10 CANS");
  });
});

describe("recipe sheet CSV parsing", () => {
  const sample = `section,key,value
recipe_info,recipe_name,POMODORO SAUCE
recipe_info,yield_total,10 GALLONS
recipe_info,active_prep_time,20 MINUTES
recipe_info,passive_cook_time,1 HOUR
recipe_info,version,2026.01
allergen,wheat_gluten,x
equipment,,TILT SKILLET
ingredient,DICED ONION,5 POUNDS
instruction,1,HEAT OIL
packaging,drop_off,PACKAGE AND LABEL`;

  it("detects recipe sheet format", () => {
    const rows = parseCsv(sample);
    expect(isRecipeSheetFormat(rows)).toBe(true);
  });

  it("parses a full pomodoro-style recipe sheet", () => {
    const [sheet] = parseRecipeSheets(parseCsv(sample));

    expect(sheet.recipeName).toBe("POMODORO SAUCE");
    expect(sheet.yieldQuantity).toBe(10);
    expect(sheet.yieldUnit).toBe("GALLONS");
    expect(sheet.activePrepMinutes).toBe(20);
    expect(sheet.passiveCookMinutes).toBe(60);
    expect(sheet.versionLabel).toBe("2026.01");
    expect(sheet.allergens).toContain("Wheat/Gluten");
    expect(sheet.equipment).toEqual(["TILT SKILLET"]);
    expect(sheet.ingredients[0]?.name).toBe("DICED ONION");
    expect(sheet.instructions[0]?.text).toBe("HEAT OIL");
    expect(sheet.packaging[0]?.type).toContain("DROP-OFF");
  });
});
