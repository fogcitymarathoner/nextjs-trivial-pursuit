import {PINECONE_API_KEY, PINECONE_INDEX_DEV} from "@/config/env";

import {recreateIndex} from "@/lib/pinecone_helpers";
import {Pinecone} from '@pinecone-database/pinecone';
// To run - npx tsx scripts/recreate_pinecone_index.ts

// Initialize clients
const pc = new Pinecone({
  apiKey: PINECONE_API_KEY!
});
// Delete and recreate index if needed
(async () => {
  await recreateIndex(pc, PINECONE_INDEX_DEV);
})();