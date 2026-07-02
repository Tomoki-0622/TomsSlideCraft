import OpenAI from "openai";
import { AzureOpenAI } from "openai";

/**
 * 環境変数に応じて OpenAI or Azure OpenAI クライアントを返す。
 * AZURE_OPENAI_ENDPOINT が設定されていれば Azure、なければ通常 OpenAI を使用。
 */
export function getOpenAIClient(): OpenAI {
  if (process.env.AZURE_OPENAI_ENDPOINT) {
    return new AzureOpenAI({
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
      apiVersion: "2024-02-01",
    });
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export function getModel(): string {
  return (
    process.env.AZURE_OPENAI_DEPLOYMENT ??
    process.env.OPENAI_MODEL ??
    "gpt-4o"
  );
}
