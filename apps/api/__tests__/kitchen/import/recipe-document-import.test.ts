/**
 * Recipe document ingest helpers and OCR model selection.
 *
 * @vitest-environment node
 */

import { afterEach, describe, expect, it } from "vitest";
import {
  allowedExtensionsForType,
  isRecipeDocumentFile,
  splitRecipeUploadFiles,
} from "@/app/api/kitchen/import/file-ingest";
import {
  recipeSheetAiSchema,
  toRecipeSheet,
} from "@/app/api/kitchen/import/lib/recipe-document-schema";
import {
  getRecipeImportModel,
  RecipeOcrNotConfiguredError,
} from "@/app/api/kitchen/import/lib/recipe-ocr-model";

describe("recipe upload file helpers", () => {
  it("allows PDF, images, and text for recipes import type", () => {
    const extensions = allowedExtensionsForType("recipes");
    expect(extensions).toContain(".csv");
    expect(extensions).toContain(".pdf");
    expect(extensions).toContain(".png");
    expect(extensions).toContain(".txt");
  });

  it("only allows CSV for other import types", () => {
    expect(allowedExtensionsForType("ingredients")).toEqual([".csv"]);
  });

  it("detects recipe document files", () => {
    expect(isRecipeDocumentFile("pomodoro.pdf")).toBe(true);
    expect(isRecipeDocumentFile("scan.PNG")).toBe(true);
    expect(isRecipeDocumentFile("basil_pesto.txt")).toBe(true);
    expect(isRecipeDocumentFile("sheet.csv")).toBe(false);
  });

  it("splits mixed recipe uploads", () => {
    const csv = new File(["section,key,value"], "sheet.csv", {
      type: "text/csv",
    });
    const pdf = new File(["%PDF"], "sheet.pdf", { type: "application/pdf" });
    const txt = new File(["BASIL PESTO\nYIELDS 3#"], "pesto.txt", {
      type: "text/plain",
    });
    const split = splitRecipeUploadFiles([csv, pdf, txt]);

    expect(split.csvFiles).toHaveLength(1);
    expect(split.documentFiles).toHaveLength(2);
  });
});

describe("getRecipeImportModel", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("prefers Gemini when GOOGLE_GENERATIVE_AI_API_KEY is set", () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-google-key";
    process.env.KITCHEN_IMPORT_AI_PROVIDER = "google";
    delete process.env.OPENAI_API_KEY;

    const config = getRecipeImportModel();
    expect(config.provider).toBe("google");
    expect(config.modelId).toBe("gemini-2.0-flash");
  });

  it("throws when no OCR provider keys are configured", () => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    expect(() => getRecipeImportModel()).toThrow(RecipeOcrNotConfiguredError);
  });
});

describe("toRecipeSheet yield repair", () => {
  // Why: the governed RecipeVersion.create guard rejects yieldQty <= 0. The AI
  // extraction must hand the command a valid yield — models emit 0 and stuff the
  // real amount into the description. toRecipeSheet is the deterministic seam
  // every AI sheet passes through (zod .transform() is not reliably applied by
  // generateObject); if this breaks, every recipe whose model omits the quantity
  // silently fails to import.
  it("keeps a positive extracted yieldQuantity", () => {
    const sheet = toRecipeSheet(
      recipeSheetAiSchema.parse({ recipeName: "Mac Sauce", yieldQuantity: 12 })
    );
    expect(sheet.yieldQuantity).toBe(12);
  });

  it("recovers the yield from the description when quantity is 0", () => {
    const sheet = toRecipeSheet(
      recipeSheetAiSchema.parse({
        recipeName: "Cougar Gold Mac Sauce",
        yieldQuantity: 0,
        yieldDescription: "5 GALLONS",
      })
    );
    expect(sheet.yieldQuantity).toBe(5);
  });

  it("defaults to 1 when neither quantity nor a numeric description exists", () => {
    const sheet = toRecipeSheet(
      recipeSheetAiSchema.parse({
        recipeName: "Mystery Sauce",
        yieldQuantity: 0,
      })
    );
    expect(sheet.yieldQuantity).toBe(1);
  });
});
