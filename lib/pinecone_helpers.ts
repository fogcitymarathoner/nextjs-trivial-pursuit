// lib/pinecone_helpers.ts
import { Pinecone } from "@pinecone-database/pinecone";
import {PINECONE_INDEX_DEV} from "@/config/env";
import { VECTOR_SIZE } from "@/config/env";

export const recreateIndex = async (pc: Pinecone, indexName: string | undefined) => {
  try {
    // Check if index exists
    const indexes = await pc.listIndexes();
    const indexExists = indexes.indexes?.some(idx => idx.name === indexName);

    if (indexExists) {
      console.log(`Deleting index: ${indexName}`);
      await pc.deleteIndex(PINECONE_INDEX_DEV);

      // CRITICAL: Wait for deletion to complete
      console.log("Waiting for index deletion to propagate...");
      await new Promise(resolve => setTimeout(resolve, 60000)); // 60 seconds

      // Verify deletion is complete
      let stillExists = true;
      let retries = 0;
      while (stillExists && retries < 10) {
        const checkIndexes = await pc.listIndexes();
        stillExists = checkIndexes.indexes?.some(idx => idx.name === indexName) || false;
        if (stillExists) {
          console.log(`Index still deleting... waiting 10 more seconds`);
          await new Promise(resolve => setTimeout(resolve, 10000));
          retries++;
        }
      }
    }

    // Create new index
    console.log(`Creating index: ${indexName}`);
    await pc.createIndex({
      name: PINECONE_INDEX_DEV,
      dimension: Number(VECTOR_SIZE),
      metric: "cosine",
      spec: {
        serverless: {
          cloud: "aws",
          region: "us-east-1"
        }
      }
    });

    // Wait for index to be ready
    console.log("Waiting for index to initialize...");
    await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds

    console.log(`✅ Index ${indexName} ready!`);

  } catch (error) {
    console.error("Failed to recreate index:", error);
    throw error;
  }
};

export const createIndexIfNotExists = async (pc: Pinecone, indexName: string) => {
  try {
    const indexes = await pc.listIndexes();
    const indexExists = indexes.indexes?.some(idx => idx.name === indexName);

    if (!indexExists) {
      console.log(`Creating index: ${indexName}`);
      await pc.createIndex({
        name: indexName,
        dimension: Number(VECTOR_SIZE),
        metric: "cosine",
        spec: {
          serverless: {
            cloud: "aws",
            region: "us-east-1"
          }
        }
      });

      console.log("Waiting for index to initialize...");
      await new Promise(resolve => setTimeout(resolve, 30000));
      console.log(`✅ Index ${indexName} created!`);
    } else {
      console.log(`✅ Index ${indexName} already exists`);
    }
  } catch (error) {
    console.error("Error with index:", error);
    throw error;
  }
};