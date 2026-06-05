import { Pinecone, Index } from "@pinecone-database/pinecone";
import {
  PINECONE_API_KEY,
  PINECONE_INDEX_DEV,
} from "@/config/env";

const pc = new Pinecone({ apiKey: PINECONE_API_KEY! });

let index: Index | null = null;

export const getPineconeIndex = (): Index =>
  index ?? (index = pc.index({ name: PINECONE_INDEX_DEV! }));