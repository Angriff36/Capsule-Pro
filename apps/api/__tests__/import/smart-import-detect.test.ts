/**
 * Smart import detection tests
 *
 * @vitest-environment node
 */

import { describe, expect, it } from "vitest";
import {
  detectImportKind,
  kindToKitchenImportType,
} from "@/app/api/import/smart/detect";

describe("smart import detection", () => {
  it("detects recipe sheet CSV", async () => {
    const csv = `section,key,value
recipe_info,recipe_name,POMODORO SAUCE
ingredient,DICED ONION,5 POUNDS`;

    const detection = await detectImportKind(
      new File([csv], "recipe.csv", { type: "text/csv" })
    );

    expect(detection.kind).toBe("kitchen-recipes");
    expect(detection.confidence).toBeGreaterThan(90);
  });

  it("detects staff roster CSV as event document", async () => {
    const csv = `Event Name,First Name,Last Name,Position,Scheduled In,Scheduled Out
Gala 2026,Jane,Doe,Server,9:00 AM,5:00 PM`;

    const detection = await detectImportKind(
      new File([csv], "staff.csv", { type: "text/csv" })
    );

    expect(detection.kind).toBe("event-document");
  });

  it("detects ingredient catalog CSV", async () => {
    const csv = `name,category,default_unit,allergens
All-Purpose Flour,baking,ea,gluten`;

    const detection = await detectImportKind(
      new File([csv], "ingredients.csv", { type: "text/csv" })
    );

    expect(detection.kind).toBe("kitchen-ingredients");
  });

  it("detects plain-text recipe files", async () => {
    const text = `BASIL PESTO
YIELDS 3#

3 POUNDS FRESH BASIL
1. BLEND ALL INGREDIENTS`;

    const detection = await detectImportKind(
      new File([text], "Basil_Pesto.txt", { type: "text/plain" })
    );

    expect(detection.kind).toBe("kitchen-recipes");
    expect(detection.confidence).toBeGreaterThanOrEqual(80);
    expect(detection.reason).toContain("Plain-text");
  });

  it("maps kitchen kinds to import types", () => {
    expect(kindToKitchenImportType("kitchen-recipes")).toBe("recipes");
    expect(kindToKitchenImportType("event-document")).toBeNull();
  });
});
