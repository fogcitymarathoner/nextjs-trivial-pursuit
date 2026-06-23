// lib/SqliteChunkManager.ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface ChunkRecord {
  id: number;
  url: string;
  chunk_index: number;
  embed_timedate: Date | string;
}

export interface ChunkInput {
  url: string;
  chunk_index: number;
}

export interface ChunkWithId extends ChunkInput {
  id: number;
}

const isSqliteConstraintError = (error: unknown): boolean =>
  error instanceof Error && error.message.includes('UNIQUE constraint failed');

const toNumberId = (id: number | bigint): number => {
  if (typeof id === 'bigint') {
    const numericId = Number(id);
    if (!Number.isSafeInteger(numericId)) {
      throw new Error(`SQLite row id ${id.toString()} is too large to represent as a safe number`);
    }
    return numericId;
  }

  return id;
};

class SqliteChunkManager {
  private static instance: SqliteChunkManager | null = null;
  private static currentDbPath: string | null = null;

  private db: Database.Database;
  private dbPath: string;
  private tableName: string = 'chunks';
  private isInMemory: boolean;

  public constructor(dbPath: string = process.env.SQLITE_CHUNK_DB_PATH ?? 'data/chunks.db') {
    // Check if we're using an in-memory database
    this.isInMemory = dbPath === ':memory:';

    if (this.isInMemory) {
      // For in-memory database, don't resolve path or create directories
      this.dbPath = ':memory:';
    } else {
      // For file-based database, resolve path and ensure directory exists
      this.dbPath = path.resolve(process.cwd(), dbPath);

      // Ensure the directory exists
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
    }

    // Open database connection
    this.db = new Database(this.dbPath);

    // Enable foreign keys and WAL mode for better performance
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL');

    // Create table if it doesn't exist
    this.createTable();
  }

  /**
   * Get the singleton instance
   * @param dbPath - Path to the SQLite database file (default: 'data/chunks.db')
   *                  Use ':memory:' for an in-memory database
   * @returns The singleton instance
   */
  public static getInstance(dbPath: string = 'data/chunks.db'): SqliteChunkManager {
    // If no instance exists or the path is different, create a new one
    if (!SqliteChunkManager.instance || SqliteChunkManager.currentDbPath !== dbPath) {
      if (SqliteChunkManager.instance) {
        // Close the existing instance if the path is different
        try {
          SqliteChunkManager.instance.close();
        } catch (error) {
          // Ignore close errors
        }
        SqliteChunkManager.instance = null;
      }
      SqliteChunkManager.currentDbPath = dbPath;
      SqliteChunkManager.instance = new SqliteChunkManager(dbPath);
    }
    return SqliteChunkManager.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  public static resetInstance(): void {
    if (SqliteChunkManager.instance) {
      try {
        SqliteChunkManager.instance.close();
      } catch (error) {
        // Ignore close errors
      }
      SqliteChunkManager.instance = null;
      SqliteChunkManager.currentDbPath = null;
    }
  }

  /**
   * Get the current instance without creating one (returns null if not initialized)
   */
  public static getExistingInstance(): SqliteChunkManager | null {
    return SqliteChunkManager.instance;
  }

  /**
   * Create the chunks table with unique constraint on url and chunk_index
   */
  private createTable(): void {
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
                                                         id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                         url TEXT NOT NULL,
                                                         chunk_index INTEGER NOT NULL,
                                                         embed_timedate DATETIME DEFAULT CURRENT_TIMESTAMP,
                                                         UNIQUE(url, chunk_index)
            )
    `;

    this.db.exec(createTableSQL);

    // Create index on url for faster lookups
    this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_chunks_url
            ON ${this.tableName} (url)
    `);

    // Create index on embed_timedate for time-based queries
    this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_chunks_embed_timedate
            ON ${this.tableName} (embed_timedate)
    `);
  }

  /**
   * Drop the chunks table
   */
  public dropTable(): void {
    const dropTableSQL = `DROP TABLE IF EXISTS ${this.tableName}`;
    this.db.exec(dropTableSQL);
    console.log(`✅ Table "${this.tableName}" dropped successfully`);
  }

  /**
   * Recreate the table (drop and create)
   */
  public recreateTable(): void {
    this.dropTable();
    this.createTable();
    console.log(`✅ Table "${this.tableName}" recreated successfully`);
  }

  /**
   * Insert a new chunk record
   * @param input - { url, chunk_index }
   * @returns The inserted record with id
   */
  public insert(input: ChunkInput): ChunkWithId {
    const insertSQL = `
        INSERT INTO ${this.tableName} (url, chunk_index, embed_timedate)
        VALUES (?, ?, CURRENT_TIMESTAMP)
    `;

    try {
      const stmt = this.db.prepare(insertSQL);
      const result = stmt.run(input.url, input.chunk_index);

      return {
        id: toNumberId(result.lastInsertRowid),
        url: input.url,
        chunk_index: input.chunk_index
      };
    } catch (error) {
      if (isSqliteConstraintError(error)) {
        throw new Error(`Duplicate entry: URL "${input.url}" and chunk_index ${input.chunk_index} already exist`);
      }
      throw error;
    }
  }

  /**
   * Insert multiple chunk records
   * @param inputs - Array of { url, chunk_index }
   * @returns Array of inserted records with ids
   */
  public insertMany(inputs: ChunkInput[]): ChunkWithId[] {
    const results: ChunkWithId[] = [];
    const insertManySQL = `
        INSERT INTO ${this.tableName} (url, chunk_index, embed_timedate)
        VALUES (?, ?, CURRENT_TIMESTAMP)
    `;

    const insertMany = this.db.transaction((items: ChunkInput[]) => {
      const stmt = this.db.prepare(insertManySQL);
      for (const item of items) {
        try {
          const result = stmt.run(item.url, item.chunk_index);
          results.push({
            id: toNumberId(result.lastInsertRowid),
            url: item.url,
            chunk_index: item.chunk_index
          });
        } catch (error) {
          if (isSqliteConstraintError(error)) {
            console.warn(`⚠️ Skipping duplicate: URL "${item.url}" chunk_index ${item.chunk_index} already exists`);
          } else {
            throw error;
          }
        }
      }
    });

    insertMany(inputs);
    return results;
  }

  /**
   * Insert or replace a chunk record (upsert)
   * @param input - { url, chunk_index }
   * @returns The upserted record with id
   */
  public upsert(input: ChunkInput): ChunkWithId {
    const upsertSQL = `
        INSERT INTO ${this.tableName} (url, chunk_index, embed_timedate)
        VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(url, chunk_index) DO UPDATE SET
            embed_timedate = CURRENT_TIMESTAMP
    `;

    const stmt = this.db.prepare(upsertSQL);
    stmt.run(input.url, input.chunk_index);

    // Get the record (either newly inserted or updated)
    const selectSQL = `
        SELECT id, url, chunk_index, embed_timedate
        FROM ${this.tableName}
        WHERE url = ? AND chunk_index = ?
    `;
    const selectStmt = this.db.prepare(selectSQL);
    const record = selectStmt.get(input.url, input.chunk_index) as ChunkRecord | undefined;

    if (!record) {
      throw new Error(`Failed to upsert chunk for URL "${input.url}" and chunk_index ${input.chunk_index}`);
    }

    return {
      id: record.id,
      url: record.url,
      chunk_index: record.chunk_index
    };
  }

  /**
   * Update a chunk record by id
   * @param id - Record id
   * @param input - { url, chunk_index }
   * @returns Updated record
   */
  public update(id: number, input: ChunkInput): ChunkWithId {
    const updateSQL = `
        UPDATE ${this.tableName}
        SET url = ?, chunk_index = ?, embed_timedate = CURRENT_TIMESTAMP
        WHERE id = ?
    `;

    try {
      const stmt = this.db.prepare(updateSQL);
      const result = stmt.run(input.url, input.chunk_index, id);

      if (result.changes === 0) {
        throw new Error(`Record with id ${id} not found`);
      }

      return {
        id: id,
        url: input.url,
        chunk_index: input.chunk_index
      };
    } catch (error) {
      if (isSqliteConstraintError(error)) {
        throw new Error(`Duplicate entry: URL "${input.url}" and chunk_index ${input.chunk_index} already exist`);
      }
      throw error;
    }
  }

  /**
   * Get a chunk record by id
   * @param id - Record id
   * @returns ChunkRecord or null if not found
   */
  public getById(id: number): ChunkRecord | null {
    const selectSQL = `
        SELECT id, url, chunk_index, embed_timedate
        FROM ${this.tableName}
        WHERE id = ?
    `;

    const stmt = this.db.prepare(selectSQL);
    const result = stmt.get(id) as ChunkRecord | undefined;
    return result || null;
  }

  /**
   * Get all chunks for a specific URL
   * @param url - The URL to search for
   * @returns Array of ChunkRecords
   */
  public getByUrl(url: string): ChunkRecord[] {
    const selectSQL = `
        SELECT id, url, chunk_index, embed_timedate
        FROM ${this.tableName}
        WHERE url = ?
        ORDER BY id ASC
    `;

    const stmt = this.db.prepare(selectSQL);
    return stmt.all(url) as ChunkRecord[];
  }

  /**
   * Get a chunk by url and chunk_index
   * @param url - The URL
   * @param chunk_index - The chunk index
   * @returns ChunkRecord or null if not found
   */
  public getByUrlAndChunkIndex(url: string, chunk_index: number): ChunkRecord | null {
    const selectSQL = `
        SELECT id, url, chunk_index, embed_timedate
        FROM ${this.tableName}
        WHERE url = ? AND chunk_index = ?
    `;

    const stmt = this.db.prepare(selectSQL);
    const result = stmt.get(url, chunk_index) as ChunkRecord | undefined;
    return result || null;
  }

  /**
   * Get all chunks
   * @returns Array of all ChunkRecords
   */
  public getAll(): ChunkRecord[] {
    const selectSQL = `
        SELECT id, url, chunk_index, embed_timedate
        FROM ${this.tableName}
        ORDER BY id ASC
    `;

    const stmt = this.db.prepare(selectSQL);
    return stmt.all() as ChunkRecord[];
  }

  /**
   * Get chunks by date range
   * @param startDate - Start date (ISO string or Date)
   * @param endDate - End date (ISO string or Date)
   * @returns Array of ChunkRecords within the date range
   */
  public getByDateRange(startDate: Date | string, endDate: Date | string): ChunkRecord[] {
    const start = typeof startDate === 'string' ? startDate : startDate.toISOString();
    const end = typeof endDate === 'string' ? endDate : endDate.toISOString();

    const selectSQL = `
        SELECT id, url, chunk_index, embed_timedate
        FROM ${this.tableName}
        WHERE embed_timedate BETWEEN ? AND ?
        ORDER BY embed_timedate ASC
    `;

    const stmt = this.db.prepare(selectSQL);
    return stmt.all(start, end) as ChunkRecord[];
  }

  /**
   * Get chunks that don't have embedding (embed_timedate is NULL or old)
   * @param olderThanMinutes - Get chunks older than this many minutes
   * @returns Array of ChunkRecords without recent embedding
   */
  public getChunksNeedingEmbedding(olderThanMinutes: number = 60): ChunkRecord[] {
    const selectSQL = `
        SELECT id, url, chunk_index, embed_timedate
        FROM ${this.tableName}
        WHERE embed_timedate IS NULL
           OR embed_timedate < datetime('now', '-' || ? || ' minutes')
        ORDER BY embed_timedate ASC NULLS FIRST
    `;

    const stmt = this.db.prepare(selectSQL);
    return stmt.all(olderThanMinutes) as ChunkRecord[];
  }

  /**
   * Delete a chunk by id
   * @param id - Record id
   * @returns true if deleted, false if not found
   */
  public delete(id: number): boolean {
    const deleteSQL = `DELETE FROM ${this.tableName} WHERE id = ?`;
    const stmt = this.db.prepare(deleteSQL);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Delete all chunks for a specific URL
   * @param url - The URL
   * @returns Number of deleted records
   */
  public deleteByUrl(url: string): number {
    const deleteSQL = `DELETE FROM ${this.tableName} WHERE url = ?`;
    const stmt = this.db.prepare(deleteSQL);
    const result = stmt.run(url);
    return result.changes;
  }

  /**
   * Delete chunks older than a certain date
   * @param olderThan - Date threshold
   * @returns Number of deleted records
   */
  public deleteOlderThan(olderThan: Date | string): number {
    const date = typeof olderThan === 'string' ? olderThan : olderThan.toISOString();
    const deleteSQL = `DELETE FROM ${this.tableName} WHERE embed_timedate < ?`;
    const stmt = this.db.prepare(deleteSQL);
    const result = stmt.run(date);
    return result.changes;
  }

  /**
   * Count total records
   * @returns Total number of records
   */
  public count(): number {
    const countSQL = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const stmt = this.db.prepare(countSQL);
    const result = stmt.get() as { count: number };
    return result.count;
  }

  /**
   * Count records by URL
   * @param url - The URL
   * @returns Number of records for the URL
   */
  public countByUrl(url: string): number {
    const countSQL = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE url = ?`;
    const stmt = this.db.prepare(countSQL);
    const result = stmt.get(url) as { count: number };
    return result.count;
  }

  /**
   * Check if a chunk exists
   * @param url - The URL
   * @param chunk_index - The chunk index
   * @returns true if exists, false otherwise
   */
  public exists(url: string, chunk_index: number): boolean {
    const existsSQL = `
        SELECT 1 FROM ${this.tableName}
        WHERE url = ? AND chunk_index = ?
            LIMIT 1
    `;
    const stmt = this.db.prepare(existsSQL);
    const result = stmt.get(url, chunk_index);
    return !!result;
  }

  /**
   * Update the embed_timedate for a chunk (mark as embedded)
   * @param id - Record id
   * @returns true if updated, false if not found
   */
  public markAsEmbedded(id: number): boolean {
    const updateSQL = `
        UPDATE ${this.tableName}
        SET embed_timedate = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    const stmt = this.db.prepare(updateSQL);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Get all unique URLs in the database
   * @returns Array of unique URLs
   */
  public getUniqueUrls(): string[] {
    const selectSQL = `
        SELECT DISTINCT url
        FROM ${this.tableName}
        ORDER BY url ASC
    `;
    const stmt = this.db.prepare(selectSQL);
    const results = stmt.all() as { url: string }[];
    return results.map(row => row.url);
  }

  /**
   * Close the database connection
   */
  public close(): void {
    this.db.close();
  }

  /**
   * Get the database instance (for advanced operations)
   */
  public getDatabase(): Database.Database {
    return this.db;
  }

  /**
   * Execute a raw SQL query (use with caution)
   * @param sql - SQL query
   * @param params - Query parameters
   * @returns Query results
   */
  public rawQuery<T = unknown>(sql: string, params: unknown[] = []): T[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  /**
   * Execute a raw SQL statement (use with caution)
   * @param sql - SQL statement
   * @param params - Statement parameters
   * @returns Statement result
   */
  public rawRun(sql: string, params: unknown[] = []): Database.RunResult {
    const stmt = this.db.prepare(sql);
    return stmt.run(...params);
  }
}

export default SqliteChunkManager;
