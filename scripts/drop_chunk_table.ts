// scripts/drop_chunk_table.ts
import SqliteChunkManager from '@/lib/SqliteChunkManager';
import readline from 'readline';
import fs from 'fs';

/**
 * Script to drop the chunks table using the singleton manager
 *
 * Usage:
 *   npx tsx scripts/drop_chunk_table.ts
 *   npx tsx scripts/drop_chunk_table.ts --force
 *   npx tsx scripts/drop_chunk_table.ts --db-path=./custom/path.db
 *   npx tsx scripts/drop_chunk_table.ts --no-vacuum  # Skip vacuuming
 */

interface ScriptOptions {
  dbPath: string;
  force: boolean;
  vacuum: boolean;
}

function parseArgs(): ScriptOptions {
  const options: ScriptOptions = {
    dbPath: 'data/chunks.db',
    force: false,
    vacuum: true  // Default to true
  };

  for (const arg of process.argv.slice(2)) {
    if (arg === '--force' || arg === '-f') {
      options.force = true;
    } else if (arg === '--no-vacuum') {
      options.vacuum = false;
    } else if (arg.startsWith('--db-path=')) {
      options.dbPath = arg.split('=')[1];
    } else if (arg.startsWith('--db=')) {
      options.dbPath = arg.split('=')[1];
    }
  }

  return options;
}

function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

function getFileSizeInMB(filePath: string): number | null {
  try {
    const stats = fs.statSync(filePath);
    return stats.size / (1024 * 1024);
  } catch {
    return null;
  }
}

async function dropChunksTable() {
  const options = parseArgs();

  console.log('🗄️  Dropping chunks table...');
  console.log(`📁 Database path: ${options.dbPath}`);
  console.log(`🔧 Force mode: ${options.force ? 'ON' : 'OFF'}`);
  console.log(`🧹 Vacuum mode: ${options.vacuum ? 'ON (will shrink file)' : 'OFF (file will keep size)'}`);

  // Show initial file size
  const initialSize = getFileSizeInMB(options.dbPath);
  if (initialSize !== null) {
    console.log(`📦 Initial database size: ${initialSize.toFixed(2)} MB`);
  }

  let manager: SqliteChunkManager | null = null;

  try {
    // Get singleton instance
    console.log('🔄 Initializing database manager...');
    manager = SqliteChunkManager.getInstance(options.dbPath);

    // Check current records
    try {
      const count = manager.count();
      console.log(`📊 Current records in chunks table: ${count}`);

      if (count === 0) {
        console.log('ℹ️  Table is empty. No data will be lost.');
      } else {
        console.log(`⚠️  WARNING: Table contains ${count} records that will be permanently deleted.`);
        console.log('   This action CANNOT be undone!');
      }
    } catch (error) {
      console.log('ℹ️  Table might not exist or is empty');
    }

    // Ask for confirmation unless --force is used
    if (!options.force) {
      console.log('\n⚠️  You are about to permanently delete the chunks table.');
      const confirm = await askConfirmation('Are you sure you want to continue? (y/N): ');

      if (!confirm) {
        console.log('\n❌ Operation cancelled by user.');
        process.exit(0);
      }

      // Double confirmation for safety
      const doubleConfirm = await askConfirmation('⚠️  ARE YOU ABSOLUTELY SURE? This will delete ALL data! (y/N): ');
      if (!doubleConfirm) {
        console.log('\n❌ Operation cancelled by user.');
        process.exit(0);
      }
    }

    // Drop the table
    console.log('\n🗑️  Dropping table...');
    const startTime = Date.now();

    manager.dropTable();

    const duration = Date.now() - startTime;
    console.log(`✅ Table dropped successfully! (${duration}ms)`);

    // Verify the table is gone
    try {
      const count = manager.count();
      console.log(`📊 Records remaining: ${count}`);
    } catch (error) {
      console.log('✅ Table no longer exists (as expected)');
    }

    // Vacuum the database to reclaim space
    if (options.vacuum) {
      console.log('\n🧹 Vacuuming database to reclaim disk space...');
      console.log('   (This may take a moment for large databases)');

      const vacuumStart = Date.now();

      try {
        // Check if SqliteChunkManager has a vacuum method
        if (typeof (manager as any).vacuum === 'function') {
          (manager as any).vacuum();
        } else {
          // Fallback: execute VACUUM directly if the method doesn't exist
          console.log('   ℹ️  Using fallback VACUUM execution...');
          (manager as any).db.exec('VACUUM');
        }

        const vacuumDuration = Date.now() - vacuumStart;
        console.log(`✅ Database vacuumed successfully! (${vacuumDuration}ms)`);

        // Show new file size
        const newSize = getFileSizeInMB(options.dbPath);
        if (newSize !== null && initialSize !== null) {
          const saved = initialSize - newSize;
          console.log(`📦 New database size: ${newSize.toFixed(2)} MB`);
          if (saved > 0) {
            console.log(`💾 Space saved: ${saved.toFixed(2)} MB (${((saved / initialSize) * 100).toFixed(1)}% reduction)`);
          } else {
            console.log('ℹ️  No significant space savings (database was already compact)');
          }
        }
      } catch (error) {
        console.error('⚠️  Warning: Failed to vacuum database:', error);
        console.log('   The table was dropped but the database file may not have been shrunk.');
        console.log('   You can manually run: sqlite3 ' + options.dbPath + ' VACUUM;');
      }
    } else {
      console.log('\nℹ️  Skipped vacuuming (--no-vacuum flag used)');
      console.log('   The database file will retain its size on disk.');
      console.log('   To shrink it, run: sqlite3 ' + options.dbPath + ' VACUUM;');
    }

    console.log('\n💡 Note: The table will be recreated automatically on next insert/query operation.');

  } catch (error) {
    console.error('\n❌ Error dropping table:', error);
    if (error instanceof Error) {
      console.error(`   Error details: ${error.message}`);
    }
    process.exit(1);
  }
}

// Run the script
dropChunksTable().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});