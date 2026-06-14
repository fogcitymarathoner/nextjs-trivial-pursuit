import {PINECONE_INDEX_DEV} from "@/config/env";
import PineconeManager from "@/lib/PineconeManager";
// To run - npx tsx scripts/recreate_pinecone_index.ts

// Delete and recreate index if needed
(async () => {
  await PineconeManager.recreateIndex(PINECONE_INDEX_DEV);
})();
