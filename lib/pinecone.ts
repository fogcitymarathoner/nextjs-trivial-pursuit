import { Pinecone, Index } from "@pinecone-database/pinecone";

import {
  PINECONE_API_TOKEN,
  PINECONE_INDEX_DEV} from "@/lib/env";

const pc = new Pinecone({ apiKey: PINECONE_API_TOKEN! });


let index:  Index | null = null;

export function getPineconeIndex():  Index {
  if (!index) {
    index = pc.index({ name: PINECONE_INDEX_DEV!});
  }
  return index;
}