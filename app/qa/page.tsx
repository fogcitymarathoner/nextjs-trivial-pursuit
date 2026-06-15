import { PINECONE_INDEXES } from '@/config/pinecone/pinecone_indexes';
import type { PineconeIndexOption } from '@/config/pinecone/types';
import { QaClient } from './qa-client';

export default function QaPage() {
  const indexes: PineconeIndexOption[] = PINECONE_INDEXES;

  return <QaClient indexes={indexes} />;
}
