import { Pinecone, Index, RecordMetadata } from "@pinecone-database/pinecone";
import {
  PINECONE_API_KEY,
  PINECONE_INDEX_DEV,
  VECTOR_SIZE,
} from "@/config/env.server";

class PineconeManager {
  private static instance: PineconeManager | null = null;
  private client: Pinecone | null = null;
  private indexes: Map<string, Index<RecordMetadata>> = new Map(); // Cache multiple indexes
  private defaultIndexName: string;

  private constructor() {
    this.defaultIndexName = PINECONE_INDEX_DEV!;
  }

  public static getInstance(): PineconeManager {
    if (!PineconeManager.instance) {
      PineconeManager.instance = new PineconeManager();
    }
    return PineconeManager.instance;
  }

  public getClient(): Pinecone {
    if (!this.client) {
      this.client = new Pinecone({ apiKey: PINECONE_API_KEY! });
    }
    return this.client;
  }

  /**
   * Get a specific index by name, or return the default index
   * @param indexName Optional name of the index to retrieve
   * @returns Pinecone Index instance
   */
  public getIndex(indexName?: string): Index<RecordMetadata> {
    const nameToUse = indexName || this.defaultIndexName;

    // Check if we already have this index cached
    if (!this.indexes.has(nameToUse)) {
      console.log(`📦 Creating new index instance for: ${nameToUse}`);
      const index = this.getClient().index({ name: nameToUse });
      this.indexes.set(nameToUse, index);
    }

    return this.indexes.get(nameToUse)!;
  }

  /**
   * Query a specific index
   * @param questionEmbedding The embedding vector to query
   * @param topK Number of results to return (default: 3)
   * @param includeMetadata Whether to include metadata (default: true)
   * @param indexName Optional name of the index to query (uses default if not provided)
   */
  public async query(
    questionEmbedding: number[],
    topK: number = 3,
    includeMetadata: boolean = true,
    indexName?: string  // Add this parameter
  ): Promise<any> {
    const index = this.getIndex(indexName);
    return index.query({
      vector: questionEmbedding,
      topK,
      includeValues: false,
      includeMetadata,
    });
  }

  /**
   * Upsert vectors to a specific index
   * @param vectors Array of vectors to upsert
   * @param indexName Optional name of the index (uses default if not provided)
   */
  public async upsert(
    vectors: Array<{
      id: string;
      values: number[];
      metadata?: RecordMetadata;
    }>,
    indexName?: string  // Add this parameter
  ): Promise<void> {
    const index = this.getIndex(indexName);
    await index.upsert({ records: vectors });
  }

  /**
   * Delete a single record from a specific index
   * @param id The ID of the record to delete
   * @param indexName Optional name of the index (uses default if not provided)
   */
  public async deleteOne(id: string, indexName?: string): Promise<void> {
    const index = this.getIndex(indexName);
    await index.deleteOne({ id });
  }

  /**
   * Delete multiple records from a specific index
   * @param ids Array of IDs to delete
   * @param indexName Optional name of the index (uses default if not provided)
   */
  public async deleteMany(ids: string[], indexName?: string): Promise<void> {
    const index = this.getIndex(indexName);
    await index.deleteMany({ ids });
  }

  /**
   * Delete all records from a specific index
   * @param indexName Optional name of the index (uses default if not provided)
   */
  public async deleteAll(indexName?: string): Promise<void> {
    const index = this.getIndex(indexName);
    await index.deleteAll();
  }

  /**
   * Get statistics for a specific index
   * @param indexName Optional name of the index (uses default if not provided)
   */
  public async describeIndexStats(indexName?: string): Promise<any> {
    const index = this.getIndex(indexName);
    return index.describeIndexStats();
  }

  /**
   * Fetch records by IDs from a specific index
   * @param ids Array of IDs to fetch
   * @param indexName Optional name of the index (uses default if not provided)
   */
  public async fetch(ids: string[], indexName?: string): Promise<any> {
    const index = this.getIndex(indexName);
    return index.fetch({ ids });
  }

  /**
   * List records with pagination from a specific index
   * @param options Pagination options
   * @param indexName Optional name of the index (uses default if not provided)
   */
  public async listPaginated(
    options?: { prefix?: string; limit?: number; paginationToken?: string },
    indexName?: string
  ): Promise<any> {
    const index = this.getIndex(indexName);
    return index.listPaginated(options);
  }

  /**
   * Create a new index
   * @param name Index name (required)
   * @param dimension Vector dimension (defaults to VECTOR_SIZE)
   * @param metric Distance metric (default: "cosine")
   */
  public async createIndex(
    name: string,  // Make name required
    dimension?: number,
    metric: "cosine" | "euclidean" | "dotproduct" = "cosine"
  ): Promise<void> {
    const dimensionValue = dimension || Number(VECTOR_SIZE);

    await this.getClient().createIndex({
      name: name,
      dimension: dimensionValue,
      metric,
      spec: {
        serverless: {
          cloud: "aws",
          region: "us-east-1"
        }
      }
    });
  }

  /**
   * Delete an index by name
   * @param name Index name to delete (required)
   */
  public async deleteIndex(name: string): Promise<void> {
    await this.getClient().deleteIndex(name);
    // Remove from cache if it exists
    if (this.indexes.has(name)) {
      this.indexes.delete(name);
    }
  }

  /**
   * Check if an index exists
   * @param name Index name to check (required)
   */
  public async indexExists(name: string): Promise<boolean> {
    const indexes = await this.getClient().listIndexes();
    return indexes.indexes?.some(idx => idx.name === name) || false;
  }

  /**
   * List all indexes
   */
  public async listIndexes(): Promise<any> {
    return this.getClient().listIndexes();
  }

  /**
   * Recreate an index (delete and create)
   * @param name Index name to recreate (required)
   * @param dimension Vector dimension
   * @param metric Distance metric
   */
  public async recreateIndex(
    name: string,  // Make name required
    dimension?: number,
    metric: "cosine" | "euclidean" | "dotproduct" = "cosine"
  ): Promise<void> {
    const dimensionValue = dimension || Number(VECTOR_SIZE);

    // Check if index exists and delete it
    if (await this.indexExists(name)) {
      console.log(`Deleting index: ${name}`);
      await this.deleteIndex(name);

      // Wait for deletion to propagate
      console.log("Waiting for index deletion to propagate...");
      await new Promise(resolve => setTimeout(resolve, 60000));

      // Verify deletion is complete
      let stillExists = true;
      let retries = 0;
      while (stillExists && retries < 10) {
        stillExists = await this.indexExists(name);
        if (stillExists) {
          console.log(`Index still deleting... waiting 10 more seconds`);
          await new Promise(resolve => setTimeout(resolve, 10000));
          retries++;
        }
      }
    }

    // Create new index
    console.log(`Creating index: ${name}`);
    await this.createIndex(name, dimensionValue, metric);

    // Wait for index to be ready
    console.log("Waiting for index to initialize...");
    await new Promise(resolve => setTimeout(resolve, 30000));

    console.log(`✅ Index ${name} ready!`);

    // Remove from cache so it will be recreated on next getIndex()
    this.indexes.delete(name);
  }

  /**
   * Ensure an index exists, create if it doesn't
   * @param name Index name to check/create (required)
   * @param dimension Vector dimension
   * @param metric Distance metric
   */
  public async ensureIndexExists(
    name: string,  // Make name required
    dimension?: number,
    metric: "cosine" | "euclidean" | "dotproduct" = "cosine"
  ): Promise<void> {
    const dimensionValue = dimension || Number(VECTOR_SIZE);

    const exists = await this.indexExists(name);

    if (!exists) {
      console.log(`Creating index: ${name}`);
      await this.createIndex(name, dimensionValue, metric);

      console.log("Waiting for index to initialize...");
      await new Promise(resolve => setTimeout(resolve, 30000));
      console.log(`✅ Index ${name} created!`);
    } else {
      console.log(`✅ Index ${name} already exists`);
    }
  }

  /**
   * Set the default index name
   * @param name Default index name to use
   */
  public setDefaultIndexName(name: string): void {
    this.defaultIndexName = name;
  }

  /**
   * Get the current default index name
   */
  public getDefaultIndexName(): string {
    return this.defaultIndexName;
  }

  // For testing purposes
  public setClient(client: Pinecone | null): void {
    this.client = client;
  }

  // For testing purposes
  public setIndex(index: Index<RecordMetadata> | null, indexName?: string): void {
    const nameToUse = indexName || this.defaultIndexName;

    if (index) {
      this.indexes.set(nameToUse, index);
    } else {
      this.indexes.delete(nameToUse);
    }
  }

  // Backward-compatible alias for tests that predate multiple index support.
  public setIndexName(name: string): void {
    this.setDefaultIndexName(name);
    this.clearIndexCache();
  }

  // Clear index cache (useful for testing)
  public clearIndexCache(): void {
    this.indexes.clear();
  }
}

// Export both the class and the default instance
export { PineconeManager };
export default PineconeManager.getInstance();
