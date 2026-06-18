import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

export interface RecipeOcrModelConfig {
  model: LanguageModel;
  modelId: string;
  provider: "google" | "openai";
}

export class RecipeOcrNotConfiguredError extends Error {
  constructor() {
    super(
      "Recipe PDF/OCR import needs GOOGLE_GENERATIVE_AI_API_KEY (free Gemini tier at https://aistudio.google.com/apikey) or OPENAI_API_KEY. Set KITCHEN_IMPORT_AI_PROVIDER=google to prefer Gemini."
    );
    this.name = "RecipeOcrNotConfiguredError";
  }
}

/** Prefer Gemini Flash (free tier); fall back to OpenAI when only that key exists. */
export function getRecipeImportModel(): RecipeOcrModelConfig {
  const providerPref = (
    process.env.KITCHEN_IMPORT_AI_PROVIDER ?? "google"
  ).toLowerCase();
  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const customModel = process.env.KITCHEN_IMPORT_OCR_MODEL?.trim();

  if (providerPref !== "openai" && googleKey) {
    const google = createGoogleGenerativeAI({ apiKey: googleKey });
    const modelId = customModel || DEFAULT_GEMINI_MODEL;
    return { model: google(modelId), modelId, provider: "google" };
  }

  if (openaiKey) {
    const openai = createOpenAI({ apiKey: openaiKey });
    const modelId = customModel || DEFAULT_OPENAI_MODEL;
    return { model: openai(modelId), modelId, provider: "openai" };
  }

  if (googleKey) {
    const google = createGoogleGenerativeAI({ apiKey: googleKey });
    const modelId = customModel || DEFAULT_GEMINI_MODEL;
    return { model: google(modelId), modelId, provider: "google" };
  }

  throw new RecipeOcrNotConfiguredError();
}
