import SqliteChunkManager from '../lib/SqliteChunkManager';

export function getAllChunks() {
    const manager = SqliteChunkManager.getInstance('data/chunks.db');
    const rows = manager.getAll();
    manager.close();
    return rows;
}