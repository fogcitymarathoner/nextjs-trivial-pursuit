import OpenAI from "openai";

import {
  EMBEDDING_MODEL} from "@/lib/env";


let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export async function getOpenAIEmbedding(
  question: string
): Promise<number[]> {
  const response = await getOpenAIClient().embeddings.create({
    model: EMBEDDING_MODEL!,
    input: question,
  });
  return response.data[0].embedding;
}

export async function warmupChatCompletion() {

  return getOpenAIClient().chat.completions.create({
    model: process.env.CHAT_MODEL!, // ensure it's set
    messages: [{role: "user", content: "warmup"}],
  });
}