/**
 * Recipe plain-text heuristics tests
 *
 * @vitest-environment node
 */

import { describe, expect, it } from "vitest";
import { looksLikeKitchenRecipeText } from "@/app/api/kitchen/import/lib/recipe-text-heuristics";
import { detectImportKind } from "@/app/api/import/smart/detect";

const COUGAR_GOLD_MAC_SAUCE = `COUGAR GOLD MAC SAUCE
YIELDS 5 GALLONS

1 POUND	BUTTER
1 POUND	ALL PURPOSE FLOUR
1.	MELT BUTTER THEN ADD FLOUR
2.	COOK UNTIL BUBBLING

2 GALLON	MILK
1/2 GALLON	HEAVY WHIP
1.	ADD TO ROUX AND USE IMMERSION BLENDER TO MIX

3 TBSP	KOSHER
2 TBSP	WHITE PEPPER
1 TBSP	GARLIC POWDER
1.	ADD TO ABOVE INGREDIENTS

4 QTS	SHREDDED GRUYERE
4 CUP	SHREDDED PARM
4 POUNDS	COUGAR GOLD
2 1/2 POUNDS	VELVEETA
1.	ADD CHEESE AND USE IMMERSION BLENDER TO MIX UNTIL SMOOTH
2.	SEASON WITH SALT AND PEPPER

1/4 CUPS	CORN STARCH
1/4 CUP	CUPS WATER
1.	MIX CORNSTARCH AND WATER TOGETHER, ADD TO SAUCE AND EMULSIFY
`;

describe("looksLikeKitchenRecipeText", () => {
  it("recognizes Cougar Gold mac sauce recipe text", () => {
    expect(looksLikeKitchenRecipeText(COUGAR_GOLD_MAC_SAUCE)).toBe(true);
  });

  it("rejects short non-recipe text", () => {
    expect(looksLikeKitchenRecipeText("hello world")).toBe(false);
  });
});

describe("smart import detection for recipe text files", () => {
  it("detects Cougar Gold .txt as kitchen recipe", async () => {
    const detection = await detectImportKind(
      new File([COUGAR_GOLD_MAC_SAUCE], "Cougar_Gold_Mac_Sauce.txt", {
        type: "text/plain",
      })
    );

    expect(detection.kind).toBe("kitchen-recipes");
    expect(detection.kind).not.toBe("event-document");
  });

  it("detects recipe-like .csv content as kitchen recipe, not event", async () => {
    const detection = await detectImportKind(
      new File([COUGAR_GOLD_MAC_SAUCE], "Cougar_Gold_Mac_Sauce.csv", {
        type: "text/csv",
      })
    );

    expect(detection.kind).toBe("kitchen-recipes");
    expect(detection.kind).not.toBe("event-document");
    expect(detection.kind).not.toBe("kitchen-events");
  });

  it("does not classify title-only CSV as kitchen event import", async () => {
    const csv = `title,yield
Cougar Gold Mac Sauce,5 gallons
1 pound,butter`;

    const detection = await detectImportKind(
      new File([csv], "Cougar_Gold_Mac_Sauce.csv", { type: "text/csv" })
    );

    expect(detection.kind).not.toBe("event-document");
    expect(detection.kind).not.toBe("kitchen-events");
  });
});
