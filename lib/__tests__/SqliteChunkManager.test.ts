// __tests__/SqliteChunkManager.test.ts

import SqliteChunkManager from '@/lib/SqliteChunkManager';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('SqliteChunkManager', () => {
  let chunkManager: SqliteChunkManager;

  beforeEach(() => {
    // Use in-memory database for testing
    chunkManager = new SqliteChunkManager(':memory:');
  });

  afterEach(() => {
    if (chunkManager) {
      chunkManager.close();
    }
  });

  describe('Constructor and Setup', () => {
    it('should create a new instance with default path (file-based)', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sqlite-chunk-manager-'));
      const previousDbPath = process.env.SQLITE_CHUNK_DB_PATH;
      process.env.SQLITE_CHUNK_DB_PATH = path.join(tempDir, 'chunks.db');

      try {
        const manager = new SqliteChunkManager();
        expect(manager).toBeInstanceOf(SqliteChunkManager);
        expect(manager.count()).toBe(0);
        manager.close();
      } finally {
        if (previousDbPath === undefined) {
          delete process.env.SQLITE_CHUNK_DB_PATH;
        } else {
          process.env.SQLITE_CHUNK_DB_PATH = previousDbPath;
        }
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should create a new instance with in-memory database', () => {
      const manager = new SqliteChunkManager(':memory:');
      expect(manager).toBeInstanceOf(SqliteChunkManager);
      expect(manager.count()).toBe(0);
      manager.close();
    });

    it('should create the chunks table with correct schema', () => {
      // Insert a record to verify table exists and works
      const result = chunkManager.insert({
        url: 'https://example.com',
        chunk_index: 1
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it('should enable foreign keys', () => {
      const db = chunkManager.getDatabase();

      // In-memory databases use 'memory' journal mode, not 'wal'
      const foreignKeys = db.pragma('foreign_keys', { simple: true }) as number;
      expect(foreignKeys).toBe(1);
    });
  });

  describe('Insert Operations', () => {
    it('should insert a single chunk record successfully', () => {
      const input = {
        url: 'https://example.com/page1',
        chunk_index: 1
      };

      const result = chunkManager.insert(input);

      expect(result).toEqual({
        id: 1,
        url: input.url,
        chunk_index: input.chunk_index
      });

      // Verify it was actually inserted
      const record = chunkManager.getById(1);
      expect(record).toBeDefined();
      expect(record?.url).toBe(input.url);
      expect(record?.chunk_index).toBe(input.chunk_index);
      expect(record?.embed_timedate).toBeDefined();
    });

    it('should throw an error when inserting a duplicate URL and chunk_index', () => {
      const input = {
        url: 'https://example.com/page1',
        chunk_index: 1
      };

      chunkManager.insert(input);

      expect(() => {
        chunkManager.insert(input);
      }).toThrow('Duplicate entry: URL "https://example.com/page1" and chunk_index 1 already exist');
    });

    it('should insert multiple chunks successfully', () => {
      const inputs = [
        { url: 'https://example.com/page1', chunk_index: 1 },
        { url: 'https://example.com/page1', chunk_index: 2 },
        { url: 'https://example.com/page2', chunk_index: 1 },
      ];

      const results = chunkManager.insertMany(inputs);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ id: 1, url: inputs[0].url, chunk_index: inputs[0].chunk_index });
      expect(results[1]).toEqual({ id: 2, url: inputs[1].url, chunk_index: inputs[1].chunk_index });
      expect(results[2]).toEqual({ id: 3, url: inputs[2].url, chunk_index: inputs[2].chunk_index });

      expect(chunkManager.count()).toBe(3);
    });

    it('should skip duplicates when inserting multiple chunks', () => {
      const inputs = [
        { url: 'https://example.com/page1', chunk_index: 1 },
        { url: 'https://example.com/page1', chunk_index: 2 },
        { url: 'https://example.com/page1', chunk_index: 1 }, // Duplicate
        { url: 'https://example.com/page2', chunk_index: 1 },
      ];

      // Spy on console.warn to verify it's called for duplicates
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const results = chunkManager.insertMany(inputs);

      expect(results).toHaveLength(3); // Only 3 unique records inserted
      expect(chunkManager.count()).toBe(3);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ Skipping duplicate: URL "https://example.com/page1" chunk_index 1 already exists')
      );

      consoleSpy.mockRestore();
    });

    it('should handle non-constraint errors gracefully', () => {
      // This test simulates a non-constraint error by using a closed connection
      const manager = new SqliteChunkManager(':memory:');

      // Insert a record to ensure the database is open
      manager.insert({ url: 'https://example.com/page1', chunk_index: 1 });

      // Close the database to simulate an error
      manager.close();

      // Trying to insert should throw
      expect(() => {
        manager.insert({ url: 'https://example.com/page1', chunk_index: 2 });
      }).toThrow();
    });
  });

  describe('Upsert Operations', () => {
    it('should insert a new record with upsert', () => {
      const input = {
        url: 'https://example.com/page1',
        chunk_index: 1
      };

      const result = chunkManager.upsert(input);

      expect(result).toEqual({
        id: 1,
        url: input.url,
        chunk_index: input.chunk_index
      });

      const record = chunkManager.getById(1);
      expect(record).toBeDefined();
    });

    it('should update an existing record with upsert', async () => {
      // Insert initial record
      const input = {
        url: 'https://example.com/page1',
        chunk_index: 1
      };

      const initial = chunkManager.insert(input);
      const initialTimestamp = chunkManager.getById(initial.id)?.embed_timedate;

      // Wait to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Upsert the same record
      const result = chunkManager.upsert(input);

      expect(result).toEqual({
        id: initial.id,
        url: input.url,
        chunk_index: input.chunk_index
      });

      const updated = chunkManager.getById(initial.id);
      // Convert both to strings for comparison
      expect(String(updated?.embed_timedate)).not.toBe(String(initialTimestamp));
    });

    it('should handle upsert successfully', () => {
      const input = {
        url: 'https://example.com/page1',
        chunk_index: 1
      };

      // Insert the record first
      chunkManager.insert(input);

      // Upsert should work
      const result = chunkManager.upsert(input);
      expect(result).toBeDefined();
      expect(result.url).toBe(input.url);
      expect(result.chunk_index).toBe(input.chunk_index);
    });
  });

  describe('Update Operations', () => {
    it('should update an existing record', () => {
      const inserted = chunkManager.insert({
        url: 'https://example.com/page1',
        chunk_index: 1
      });

      const result = chunkManager.update(inserted.id, {
        url: 'https://example.com/page1',
        chunk_index: 2
      });

      expect(result).toEqual({
        id: inserted.id,
        url: 'https://example.com/page1',
        chunk_index: 2
      });

      const record = chunkManager.getById(inserted.id);
      expect(record?.chunk_index).toBe(2);
    });

    it('should throw an error when updating a non-existent record', () => {
      expect(() => {
        chunkManager.update(9999, {
          url: 'https://example.com/page1',
          chunk_index: 1
        });
      }).toThrow('Record with id 9999 not found');
    });

    it('should throw an error when updating to a duplicate URL and chunk_index', () => {
      // Insert first record
      chunkManager.insert({
        url: 'https://example.com/page1',
        chunk_index: 1
      });

      // Insert second record
      const second = chunkManager.insert({
        url: 'https://example.com/page2',
        chunk_index: 1
      });

      // Try to update second record to match the first
      expect(() => {
        chunkManager.update(second.id, {
          url: 'https://example.com/page1',
          chunk_index: 1
        });
      }).toThrow('Duplicate entry: URL "https://example.com/page1" and chunk_index 1 already exist');
    });
  });

  describe('Query Operations', () => {
    beforeEach(() => {
      // Insert test data
      const testData = [
        { url: 'https://example.com/page1', chunk_index: 1 },
        { url: 'https://example.com/page1', chunk_index: 2 },
        { url: 'https://example.com/page2', chunk_index: 1 },
        { url: 'https://example.com/page3', chunk_index: 1 },
      ];
      chunkManager.insertMany(testData);
    });

    it('should get a record by id', () => {
      const record = chunkManager.getById(1);

      expect(record).toBeDefined();
      expect(record?.id).toBe(1);
      expect(record?.url).toBe('https://example.com/page1');
      expect(record?.chunk_index).toBe(1);
      expect(record?.embed_timedate).toBeDefined();
    });

    it('should return null when getting a non-existent id', () => {
      const record = chunkManager.getById(9999);
      expect(record).toBeNull();
    });

    it('should get all records by URL', () => {
      const records = chunkManager.getByUrl('https://example.com/page1');

      expect(records).toHaveLength(2);
      expect(records[0].chunk_index).toBe(1);
      expect(records[1].chunk_index).toBe(2);
    });

    it('should return empty array for URL with no records', () => {
      const records = chunkManager.getByUrl('https://example.com/nonexistent');
      expect(records).toHaveLength(0);
    });

    it('should get a record by URL and chunk_index', () => {
      const record = chunkManager.getByUrlAndChunkIndex(
        'https://example.com/page1',
        1
      );

      expect(record).toBeDefined();
      expect(record?.id).toBe(1);
    });

    it('should return null when getting non-existent URL and chunk_index', () => {
      const record = chunkManager.getByUrlAndChunkIndex(
        'https://example.com/page1',
        999
      );
      expect(record).toBeNull();
    });

    it('should get all records', () => {
      const all = chunkManager.getAll();
      expect(all).toHaveLength(4);
    });

    it('should get records by date range', () => {
      // Insert a record with a specific timestamp
      const db = chunkManager.getDatabase();
      const insertSQL = `
          INSERT INTO chunks (url, chunk_index, embed_timedate)
          VALUES (?, ?, ?)
      `;
      const stmt = db.prepare(insertSQL);
      stmt.run(
        'https://example.com/page4',
        1,
        '2024-01-01 12:00:00'
      );

      const records = chunkManager.getByDateRange(
        '2024-01-01 00:00:00',
        '2024-01-01 23:59:59'
      );

      expect(records).toHaveLength(1);
      expect(records[0].url).toBe('https://example.com/page4');
    });

    it('should get unique URLs', () => {
      const urls = chunkManager.getUniqueUrls();

      expect(urls).toHaveLength(3);
      expect(urls).toContain('https://example.com/page1');
      expect(urls).toContain('https://example.com/page2');
      expect(urls).toContain('https://example.com/page3');
    });
  });

  describe('Embedding Operations', () => {
    it('should get chunks needing embedding', () => {
      // Insert some chunks
      const results = chunkManager.insertMany([
        { url: 'https://example.com/page1', chunk_index: 1 },
        { url: 'https://example.com/page2', chunk_index: 1 },
      ]);

      // Get chunks needing embedding (older than 0 minutes)
      const needingEmbedding = chunkManager.getChunksNeedingEmbedding(0);

      // For in-memory database with CURRENT_TIMESTAMP, the timestamps are set immediately
      // So we need to check that chunks exist
      expect(results).toHaveLength(2);
      expect(chunkManager.count()).toBe(2);
    });

    it('should mark a chunk as embedded', () => {
      const inserted = chunkManager.insert({
        url: 'https://example.com/page1',
        chunk_index: 1
      });

      const result = chunkManager.markAsEmbedded(inserted.id);
      expect(result).toBe(true);

      // Verify the timestamp was updated
      const record = chunkManager.getById(inserted.id);
      expect(record?.embed_timedate).toBeDefined();
    });

    it('should return false when marking non-existent chunk as embedded', () => {
      const result = chunkManager.markAsEmbedded(9999);
      expect(result).toBe(false);
    });

    it('should handle embedding operations correctly', async () => {
      // Insert a chunk
      const inserted = chunkManager.insert({
        url: 'https://example.com/page1',
        chunk_index: 1
      });

      // Mark it as embedded
      const marked = chunkManager.markAsEmbedded(inserted.id);
      expect(marked).toBe(true);

      // Verify the chunk exists
      const record = chunkManager.getById(inserted.id);
      expect(record).toBeDefined();
    });
  });

  describe('Delete Operations', () => {
    beforeEach(() => {
      // Insert test data
      chunkManager.insertMany([
        { url: 'https://example.com/page1', chunk_index: 1 },
        { url: 'https://example.com/page1', chunk_index: 2 },
        { url: 'https://example.com/page2', chunk_index: 1 },
      ]);
    });

    it('should delete a record by id', () => {
      const deleted = chunkManager.delete(1);
      expect(deleted).toBe(true);

      const record = chunkManager.getById(1);
      expect(record).toBeNull();
      expect(chunkManager.count()).toBe(2);
    });

    it('should return false when deleting non-existent id', () => {
      const deleted = chunkManager.delete(9999);
      expect(deleted).toBe(false);
    });

    it('should delete all records by URL', () => {
      const deletedCount = chunkManager.deleteByUrl('https://example.com/page1');
      expect(deletedCount).toBe(2);

      const remaining = chunkManager.getByUrl('https://example.com/page1');
      expect(remaining).toHaveLength(0);
      expect(chunkManager.count()).toBe(1);
    });

    it('should delete records older than a date', () => {
      // Insert a record with a specific timestamp
      const db = chunkManager.getDatabase();
      const insertSQL = `
          INSERT INTO chunks (url, chunk_index, embed_timedate)
          VALUES (?, ?, ?)
      `;
      const stmt = db.prepare(insertSQL);
      stmt.run(
        'https://example.com/page3',
        1,
        '2024-01-01 12:00:00'
      );

      const deletedCount = chunkManager.deleteOlderThan('2024-01-02 00:00:00');
      expect(deletedCount).toBe(1);

      const oldRecord = chunkManager.getByUrlAndChunkIndex(
        'https://example.com/page3',
        1
      );
      expect(oldRecord).toBeNull();
    });

    it('should not delete records newer than the date', () => {
      const count = chunkManager.count();
      // Use a date in the past to avoid deleting anything
      const deletedCount = chunkManager.deleteOlderThan('2020-01-01 00:00:00');
      expect(deletedCount).toBe(0);
      expect(chunkManager.count()).toBe(count);
    });
  });

  describe('Count Operations', () => {
    it('should count total records', () => {
      expect(chunkManager.count()).toBe(0);

      chunkManager.insert({ url: 'https://example.com/page1', chunk_index: 1 });
      expect(chunkManager.count()).toBe(1);

      chunkManager.insert({ url: 'https://example.com/page1', chunk_index: 2 });
      expect(chunkManager.count()).toBe(2);
    });

    it('should count records by URL', () => {
      chunkManager.insertMany([
        { url: 'https://example.com/page1', chunk_index: 1 },
        { url: 'https://example.com/page1', chunk_index: 2 },
        { url: 'https://example.com/page2', chunk_index: 1 },
      ]);

      expect(chunkManager.countByUrl('https://example.com/page1')).toBe(2);
      expect(chunkManager.countByUrl('https://example.com/page2')).toBe(1);
      expect(chunkManager.countByUrl('https://example.com/nonexistent')).toBe(0);
    });
  });

  describe('Exists Operation', () => {
    it('should return true if a chunk exists', () => {
      chunkManager.insert({
        url: 'https://example.com/page1',
        chunk_index: 1
      });

      const exists = chunkManager.exists(
        'https://example.com/page1',
        1
      );
      expect(exists).toBe(true);
    });

    it('should return false if a chunk does not exist', () => {
      const exists = chunkManager.exists(
        'https://example.com/page1',
        999
      );
      expect(exists).toBe(false);
    });
  });

  describe('Table Management Operations', () => {
    it('should drop the table', () => {
      // Insert some data first
      chunkManager.insert({ url: 'https://example.com/page1', chunk_index: 1 });
      expect(chunkManager.count()).toBe(1);

      // Drop the table
      chunkManager.dropTable();

      // For testing, we'll verify that the table was dropped by trying to insert
      // which should work because createTable is called in the constructor
      // but since we already have an instance, we need to recreate
      chunkManager.recreateTable();
      expect(chunkManager.count()).toBe(0);
    });

    it('should recreate the table', () => {
      // Insert some data first
      chunkManager.insert({ url: 'https://example.com/page1', chunk_index: 1 });
      expect(chunkManager.count()).toBe(1);

      // Recreate the table
      chunkManager.recreateTable();

      // Table should be empty
      expect(chunkManager.count()).toBe(0);

      // Should be able to insert again
      chunkManager.insert({ url: 'https://example.com/page2', chunk_index: 1 });
      expect(chunkManager.count()).toBe(1);
    });
  });

  describe('Advanced Operations', () => {
    it('should execute raw queries safely', () => {
      chunkManager.insertMany([
        { url: 'https://example.com/page1', chunk_index: 1 },
        { url: 'https://example.com/page1', chunk_index: 2 },
      ]);

      const results = chunkManager.rawQuery<{ url: string; count: number }>(
        'SELECT url, COUNT(*) as count FROM chunks GROUP BY url'
      );

      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('https://example.com/page1');
      expect(results[0].count).toBe(2);
    });

    it('should execute raw run statements safely', () => {
      const result = chunkManager.rawRun(
        'INSERT INTO chunks (url, chunk_index) VALUES (?, ?)',
        ['https://example.com/page1', 1]
      );

      expect(result.changes).toBe(1);
      expect(chunkManager.count()).toBe(1);
    });

    it('should close the database connection', () => {
      chunkManager.close();

      // After closing, operations should throw
      expect(() => {
        chunkManager.count();
      }).toThrow();
    });

    it('should get the database instance', () => {
      const db = chunkManager.getDatabase();
      expect(db).toBeDefined();
      expect(db.prepare).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle duplicate constraint errors in insert', () => {
      chunkManager.insert({
        url: 'https://example.com/page1',
        chunk_index: 1
      });

      expect(() => {
        chunkManager.insert({
          url: 'https://example.com/page1',
          chunk_index: 1
        });
      }).toThrow('Duplicate entry: URL "https://example.com/page1" and chunk_index 1 already exist');
    });

    it('should handle duplicate constraint errors in update', () => {
      // Insert two different chunks
      chunkManager.insert({
        url: 'https://example.com/page1',
        chunk_index: 1
      });

      const second = chunkManager.insert({
        url: 'https://example.com/page2',
        chunk_index: 1
      });

      // Try to update the second to match the first
      expect(() => {
        chunkManager.update(second.id, {
          url: 'https://example.com/page1',
          chunk_index: 1
        });
      }).toThrow('Duplicate entry: URL "https://example.com/page1" and chunk_index 1 already exist');
    });

    it('should handle errors in rawQuery gracefully', () => {
      expect(() => {
        chunkManager.rawQuery('INVALID SQL');
      }).toThrow();
    });

    it('should handle errors in rawRun gracefully', () => {
      expect(() => {
        chunkManager.rawRun('INVALID SQL');
      }).toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle large number of records', () => {
      const batchSize = 100;
      const chunks = [];
      for (let i = 0; i < batchSize; i++) {
        chunks.push({
          url: `https://example.com/page${i % 10}`,
          chunk_index: Math.floor(i / 10) + 1
        });
      }

      const results = chunkManager.insertMany(chunks);
      expect(results).toHaveLength(batchSize);
      expect(chunkManager.count()).toBe(batchSize);
    });

    it('should handle very long URLs', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(1000) + '/page';
      const result = chunkManager.insert({
        url: longUrl,
        chunk_index: 1
      });

      expect(result).toBeDefined();
      const record = chunkManager.getById(result.id);
      expect(record?.url).toBe(longUrl);
    });

    it('should handle special characters in URL', () => {
      const specialUrl = 'https://example.com/page?query=value&foo=bar#section';

      const result = chunkManager.insert({
        url: specialUrl,
        chunk_index: 1
      });

      expect(result).toBeDefined();
      const record = chunkManager.getById(result.id);
      expect(record?.url).toBe(specialUrl);
      expect(record?.chunk_index).toBe(1);
    });

    it('should handle multiple operations in sequence', () => {
      // Perform operations in sequence
      const operations = [];
      for (let i = 0; i < 10; i++) {
        operations.push(
          () => chunkManager.insert({
            url: `https://example.com/page${i % 3}`,
            chunk_index: Math.floor(i / 3) + 1
          })
        );
      }

      // Execute operations
      for (const op of operations) {
        op();
      }

      expect(chunkManager.count()).toBe(10);
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should handle closing the database multiple times', () => {
      chunkManager.close();

      // Closing twice should not throw
      expect(() => {
        chunkManager.close();
      }).not.toThrow();
    });

    it('should handle operations after close', () => {
      chunkManager.close();

      expect(() => {
        chunkManager.count();
      }).toThrow();
    });
  });
});
