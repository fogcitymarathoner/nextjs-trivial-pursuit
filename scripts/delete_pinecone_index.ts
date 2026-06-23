// scripts/delete_pinecone_index.ts

// To run - npx tsx scripts/delete_pinecone_index.ts --env-file .env.local [options]
// Examples:
//   npx tsx scripts/delete_pinecone_index.ts --index presidents  # Delete all records from "presidents" index
//   npx tsx scripts/delete_pinecone_index.ts -i documents        # Delete all records from "documents" index
//   npx tsx scripts/delete_pinecone_index.ts --yes               # Skip confirmation prompt
//   npx tsx scripts/delete_pinecone_index.ts --help              # Show help

import { PineconeManager } from '@/lib/PineconeManager';
import readline from 'readline';

interface DeleteConfig {
  indexName: string;
  yes: boolean;
  showHelp: boolean;
}

const DEFAULT_INDEX = 'presidents';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promise-based question function
function askQuestion(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

function showHelp(): void {
  console.log(`
📚 Delete Pinecone Index Records - Help Guide
${"=".repeat(60)}

USAGE:
  npx tsx scripts/delete_pinecone_index.ts [options]

OPTIONS:
  -i, --index <name>      Name of the Pinecone index to delete records from (default: ${DEFAULT_INDEX})
  
  -y, --yes               Skip confirmation prompt (non-interactive mode)
  
  -h, --help              Show this help message

EXAMPLES:
  # Delete all records from the default index (with confirmation)
  npx tsx scripts/delete_pinecone_index.ts

  # Delete all records from a specific index (with confirmation)
  npx tsx scripts/delete_pinecone_index.ts --index documents

  # Delete all records without confirmation (non-interactive)
  npx tsx scripts/delete_pinecone_index.ts --yes

  # Delete all records from specific index without confirmation
  npx tsx scripts/delete_pinecone_index.ts -i presidents --yes

WARNING:
  ⚠️  This operation is IRREVERSIBLE! All vectors and metadata will be permanently deleted.
  ⚠️  Use with extreme caution in production environments.

${"=".repeat(60)}
  `);
}

function parseArguments(): DeleteConfig {
  const args = process.argv.slice(2);
  const config: DeleteConfig = {
    indexName: DEFAULT_INDEX,
    yes: false,
    showHelp: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      config.showHelp = true;
      return config;
    }

    if (arg === '-y' || arg === '--yes') {
      config.yes = true;
      continue;
    }

    if (arg === '-i' || arg === '--index') {
      const value = args[i + 1];
      if (!value) {
        console.error(`❌ Error: Index name is required`);
        process.exit(1);
      }
      config.indexName = value;
      i++;
      continue;
    }
  }

  return config;
}

async function confirmWithDoubleCheck(indexName: string): Promise<boolean> {
  console.log(`\n⚠️  DANGER: You are about to DELETE ALL RECORDS from: "${indexName}"`);
  console.log(`   This is a destructive operation that cannot be undone!`);
  console.log(`   All data in this index will be permanently lost.\n`);

  // First confirmation
  const answer1 = await askQuestion(`📝 Enter the index name to confirm (type "${indexName}"): `);
  if (answer1.trim() !== indexName) {
    console.log(`❌ Confirmation failed. Operation cancelled.`);
    return false;
  }

  // Second confirmation
  const answer2 = await askQuestion(`\n🔄 Please confirm again by typing "DELETE" to proceed: `);
  if (answer2.trim() !== 'DELETE') {
    console.log(`❌ Second confirmation failed. Operation cancelled.`);
    return false;
  }

  console.log(`\n✅ Both confirmations received. Proceeding with deletion...`);
  return true;
}

async function deleteIndexRecords(config: DeleteConfig): Promise<void> {
  console.log(`\n🚀 Starting Pinecone index record deletion`);
  console.log(`📅 ${new Date().toLocaleString()}`);
  console.log(`📋 Index: ${config.indexName}`);
  console.log(`🤖 Non-interactive mode: ${config.yes ? 'ON' : 'OFF'}`);
  console.log('='.repeat(60));

  try {
    // Get the Pinecone manager instance using the class
    const manager = PineconeManager.getInstance();

    // Check if index exists
    console.log(`\n🔍 Checking if index "${config.indexName}" exists...`);
    const exists = await manager.indexExists(config.indexName);

    if (!exists) {
      console.error(`❌ Error: Index "${config.indexName}" does not exist`);
      const indexes = await manager.listIndexes();
      const indexNames = indexes.indexes?.map((idx: any) => idx.name).join(', ') || 'None';
      console.log(`   Available indexes: ${indexNames}`);
      process.exit(1);
    }

    console.log(`✅ Index "${config.indexName}" exists`);

    // Get index statistics before deletion
    console.log(`\n📊 Fetching index statistics...`);
    try {
      const stats = await manager.describeIndexStats(config.indexName);
      console.log(`📊 Index stats before deletion:`);
      console.log(`   Total vector count: ${stats.totalRecordCount || 0}`);
      console.log(`   Dimension: ${stats.dimension || 'Unknown'}`);
      const namespaceCount = stats.namespaces ? Object.keys(stats.namespaces).length : 0;
      console.log(`   Namespace count: ${namespaceCount}`);
    } catch (statsError) {
      console.log(`⚠️  Could not fetch index stats: ${statsError}`);
    }

    // Confirm deletion
    let proceed = false;

    if (config.yes) {
      console.log(`\n⚠️  Skipping confirmation (--yes flag provided)`);
      proceed = true;
    } else {
      // Use double confirmation for safety
      proceed = await confirmWithDoubleCheck(config.indexName);
    }

    if (!proceed) {
      console.log('\n❌ Operation cancelled by user.');
      process.exit(0);
    }

    // Perform the deletion
    console.log(`\n🗑️  Deleting all records from index "${config.indexName}"...`);
    const startTime = Date.now();

    await manager.deleteAll(config.indexName);

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`✅ Successfully deleted all records from "${config.indexName}"`);
    console.log(`⏱️  Deletion completed in ${elapsedTime} seconds`);

    // Verify deletion
    console.log(`\n🔍 Verifying deletion...`);
    try {
      const statsAfter = await manager.describeIndexStats(config.indexName);
      console.log(`📊 Index stats after deletion:`);
      console.log(`   Total vector count: ${statsAfter.totalRecordCount || 0}`);

      if (statsAfter.totalRecordCount === 0) {
        console.log(`✅ Verification successful: Index is empty`);
      } else {
        console.log(`⚠️  Warning: Index still has ${statsAfter.totalRecordCount} records. You may need to wait for the deletion to propagate.`);
      }
    } catch (statsError) {
      console.log(`⚠️  Could not verify deletion: ${statsError}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 DELETION COMPLETE');
    console.log('='.repeat(60));
    console.log(`✅ Index: ${config.indexName}`);
    console.log(`✅ Status: All records deleted successfully`);
    console.log(`⏱️  Time: ${elapsedTime} seconds`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Fatal error during deletion:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Main execution
(async () => {
  try {
    const config = parseArguments();

    if (config.showHelp) {
      showHelp();
      process.exit(0);
    }

    await deleteIndexRecords(config);

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    rl.close();
    process.exit(1);
  }
})();