/**
 * Recipe document ingest helpers and OCR model selection.
 *
 * @vitest-environment node
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  allowedExtensionsForType,
  isRecipeDocumentFile,
  splitRecipeUploadFiles,
} from "@/app/api/kitchen/import/file-ingest";
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
