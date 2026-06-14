import { Pinecone, Index, RecordMetadata } from "@pinecone-database/pinecone";
import {
  PINECONE_API_KEY,
  PINECONE_INDEX_DEV,
  VECTOR_SIZE,
} from "@/config/env";

class PineconeManager {
  private static instance: PineconeManager | null = null;
  private client: Pinecone | null = null;
  private index: Index<RecordMetadata> | null = null;
  private indexName: string;

  private constructor() {
    this.indexName = PINECONE_INDEX_DEV!;
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

  public getIndex(): Index<RecordMetadata> {
    if (!this.index) {
      this.index = this.getClient().index({ name: this.indexName });
    }
    return this.index;
  }

  public async query(questionEmbedding: number[], topK: number = 3, includeMetadata: boolean = true): Promise<any> {
    return this.getIndex().query({
      vector: questionEmbedding,
      topK,
      includeValues: false,
      includeMetadata,
    });
  }

  public async upsert(vectors: Array<{
    id: string;
    values: number[];
    metadata?: RecordMetadata;
  }>): Promise<void> {
    await this.getIndex().upsert({ records: vectors });
  }

  public async deleteOne(id: string): Promise<void> {
    await this.getIndex().deleteOne({ id });
  }

  public async deleteMany(ids: string[]): Promise<void> {
    await this.getIndex().deleteMany({ ids });
  }

  public async deleteAll(): Promise<void> {
    await this.getIndex().deleteAll();
  }

  public async describeIndexStats(): Promise<any> {
    return this.getIndex().describeIndexStats();
  }

  public async fetch(ids: string[]): Promise<any> {
    return this.getIndex().fetch({ ids });
  }

  public async listPaginated(options?: { prefix?: string; limit?: number; paginationToken?: string }): Promise<any> {
    return this.getIndex().listPaginated(options);
  }

  public async createIndex(
    name?: string,
    dimension?: number,
    metric: "cosine" | "euclidean" | "dotproduct" = "cosine"
  ): Promise<void> {
    const indexName = name || this.indexName;
    const dimensionValue = dimension || Number(VECTOR_SIZE);

    await this.getClient().createIndex({
      name: indexName,
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

  public async deleteIndex(name?: string): Promise<void> {
    const indexName = name || this.indexName;
    await this.getClient().deleteIndex(indexName);
    // Reset the index if it was the current one
    if (this.index && this.indexName === indexName) {
      this.index = null;
    }
  }

  public async indexExists(name?: string): Promise<boolean> {
    const indexName = name || this.indexName;
    const indexes = await this.getClient().listIndexes();
    return indexes.indexes?.some(idx => idx.name === indexName) || false;
  }

  public async listIndexes(): Promise<any> {
    return this.getClient().listIndexes();
  }

  public async recreateIndex(
    name?: string,
    dimension?: number,
    metric: "cosine" | "euclidean" | "dotproduct" = "cosine"
  ): Promise<void> {
    const indexName = name || this.indexName;
    const dimensionValue = dimension || Number(VECTOR_SIZE);

    // Check if index exists and delete it
    if (await this.indexExists(indexName)) {
      console.log(`Deleting index: ${indexName}`);
      await this.deleteIndex(indexName);

      // Wait for deletion to propagate
      console.log("Waiting for index deletion to propagate...");
      await new Promise(resolve => setTimeout(resolve, 60000));

      // Verify deletion is complete
      let stillExists = true;
      let retries = 0;
      while (stillExists && retries < 10) {
        stillExists = await this.indexExists(indexName);
        if (stillExists) {
          console.log(`Index still deleting... waiting 10 more seconds`);
          await new Promise(resolve => setTimeout(resolve, 10000));
          retries++;
        }
      }
    }

    // Create new index
    console.log(`Creating index: ${indexName}`);
    await this.createIndex(indexName, dimensionValue, metric);

    // Wait for index to be ready
    console.log("Waiting for index to initialize...");
    await new Promise(resolve => setTimeout(resolve, 30000));

    console.log(`✅ Index ${indexName} ready!`);

    // Reset index reference so it will be recreated on next getIndex()
    this.index = null;
  }

  public async ensureIndexExists(
    name?: string,
    dimension?: number,
    metric: "cosine" | "euclidean" | "dotproduct" = "cosine"
  ): Promise<void> {
    const indexName = name || this.indexName;
    const dimensionValue = dimension || Number(VECTOR_SIZE);

    const exists = await this.indexExists(indexName);

    if (!exists) {
      console.log(`Creating index: ${indexName}`);
      await this.createIndex(indexName, dimensionValue, metric);

      console.log("Waiting for index to initialize...");
      await new Promise(resolve => setTimeout(resolve, 30000));
      console.log(`✅ Index ${indexName} created!`);
    } else {
      console.log(`✅ Index ${indexName} already exists`);
    }
  }

  public setClient(client: Pinecone | null): void {
    this.client = client;
  }

  public setIndex(index: Index<RecordMetadata> | null): void {
    this.index = index;
  }

  public setIndexName(name: string): void {
    this.indexName = name;
    // Reset the index since the name changed
    this.index = null;
  }
}

// Export both the class and the default instance
export { PineconeManager };
export default PineconeManager.getInstance();
