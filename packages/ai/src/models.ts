import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { keys } from "./keys.js";

const openai = createOpenAI({
  apiKey: keys().OPENAI_API_KEY,
});

export const models: {
  chat: LanguageModel;
  embeddings: LanguageModel;
} = {
  chat: openai("gpt-4o-mini"),
  embeddings: openai("text-embedding-3-small"),
};
