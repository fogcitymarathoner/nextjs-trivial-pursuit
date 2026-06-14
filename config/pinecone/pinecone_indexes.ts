import type { PineconeIndexOption } from './types';
import { PINECONE_INDEX_DEV } from '@/config/env.server';

// Your available Pinecone indexes
export const PINECONE_INDEXES = [
  {
    label: "Presidents",
    indexName: PINECONE_INDEX_DEV,
    description: "Historical president documents"
  },
] satisfies PineconeIndexOption[];

// Create a Map for O(1) lookups
const LABEL_TO_INDEX_NAME_MAP = new Map(
  PINECONE_INDEXES.map(idx => [idx.label, idx.indexName])
);

export function getIndexNameByLabel(label: string): string | undefined {
  if (!label) return undefined;

  return LABEL_TO_INDEX_NAME_MAP.get(label);
}
