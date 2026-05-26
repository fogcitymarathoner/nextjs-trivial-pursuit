import OpenAI from "openai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: '.env.local' });


const DEBUG = process.env.DEBUG;
if (!DEBUG) throw new Error("DEBUG is not set");
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL;
if (!EMBEDDING_MODEL) throw new Error("EMBEDDING_MODEL is not set");

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