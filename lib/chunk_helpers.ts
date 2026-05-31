import { getOpenAIClient } from "./openai";
import { EMBEDDING_MODEL } from "@src/config/env"

interface ChunkMetadata {
  text: string;
  title: string;
  pageUrl: string;
  namespace: string;
  customerUid: string;
  scrapeVersion: string;
  chunkIndex: number;
  links: string[];
  pageNumbers: number[] | null;
}

export function generateChunkId(chunkText: string): string {
  // Implement your chunk ID generation logic
  return Buffer.from(chunkText.substring(0, 100)).toString('base64');
}

export async function embed(text: string): Promise<number[]> {
  // Implement OpenAI embedding logic
  const openai = getOpenAIClient();
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL!, // non-null assertion, ensure it's defined
    input: text
  });
  return response.data[0].embedding;
}

export function processChunkMetadata(
  chunkText: string,
  title: string,
  pageUrl: string,
  namespace: string,
  customerUid: string,
  scrapeVersion: string,
  chunkIndex: number,
  links: string[],
  pageNumbers: number[] | null
): ChunkMetadata {
  return {
    text: chunkText,
    title,
    pageUrl,
    namespace,
    customerUid,
    scrapeVersion,
    chunkIndex,
    links,
    pageNumbers
  };
}