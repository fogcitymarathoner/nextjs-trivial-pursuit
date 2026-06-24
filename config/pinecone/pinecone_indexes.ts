import type { PineconeIndexOption } from './types';
import { PINECONE_INDEX_DEV } from '@/config/env.server';

const PRESIDENTS_LABEL = 'Presidents';

const getRuntimePineconeIndexName = (): string =>
  process.env.PINECONE_INDEX_DEV || PINECONE_INDEX_DEV || '';

// Your available Pinecone indexes
export const PINECONE_INDEXES = [
  {
    label: PRESIDENTS_LABEL,
    get indexName() {
      return getRuntimePineconeIndexName();
    },
    description: 'Historical president documents'
  },
] satisfies PineconeIndexOption[];

export function getIndexNameByLabel(label: string): string | undefined {
  if (!label) return undefined;

  const index = PINECONE_INDEXES.find(idx => idx.label === label);
  return index?.indexName || undefined;
}
