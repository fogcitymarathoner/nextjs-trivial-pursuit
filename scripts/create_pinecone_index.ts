// scripts/create_pinecone_index.ts

// To run - npx tsx scripts/create_pinecone_index.ts --env-file .env.local [options]
// Examples:
//   npx tsx scripts/create_pinecone_index.ts                          # Create default index
//   npx tsx scripts/create_pinecone_index.ts --name my-index         # Create specific index
//   npx tsx scripts/create_pinecone_index.ts --dimension 1536        # Custom dimension
//   npx tsx scripts/create_pinecone_index.ts --help                  # Show help

import { Pinecone } from '@pinecone-database/pinecone';
import { PINECONE_API_KEY, PINECONE_INDEX_DEV, VECTOR_SIZE } from "@/config/env.server";
import readline from 'readline';

interface CreateConfig {
  indexName: string;
  dimension: number;
  metric: 'cosine' | 'euclidean' | 'dotproduct';
  cloud: string;
  region: string;
  yes: boolean;
  showHelp: boolean;
}

const DEFAULT_INDEX = PINECONE_INDEX_DEV || 'presidents-dev';
const DEFAULT_DIMENSION = Number(VECTOR_SIZE) || 1536;
const DEFAULT_METRIC = 'cosine' as const;
const DEFAULT_CLOUD = 'aws';
const DEFAULT_REGION = 'us-east-1';

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
📚 Create Pinecone Index - Help Guide
${"=".repeat(60)}

USAGE:
  npx tsx scripts/create_pinecone_index.ts [options]

OPTIONS:
  -n, --name <name>         Name of the index to create (default: ${DEFAULT_INDEX})
  
  -d, --dimension <number>  Vector dimension (default: ${DEFAULT_DIMENSION})
  
  -m, --metric <type>       Distance metric: cosine, euclidean, or dotproduct (default: ${DEFAULT_METRIC})
  
  -c, --cloud <name>        Cloud provider: aws, gcp, or azure (default: ${DEFAULT_CLOUD})
  
  -r, --region <name>       Cloud region (default: ${DEFAULT_REGION})
  
  -y, --yes                 Skip confirmation prompt (non-interactive mode)
  
  -h, --help                Show this help message

EXAMPLES:
  # Create default index
  npx tsx scripts/create_pinecone_index.ts

  # Create a specific index
  npx tsx scripts/create_pinecone_index.ts --name my-presidents-index

  # Create with custom dimension and metric
  npx tsx scripts/create_pinecone_index.ts --dimension 768 --metric dotproduct

  # Create without confirmation (non-interactive)
  npx tsx scripts/create_pinecone_index.ts --yes

${"=".repeat(60)}
  `);
}

function parseArguments(): CreateConfig {
  const args = process.argv.slice(2);
  const config: CreateConfig = {
    indexName: DEFAULT_INDEX,
    dimension: DEFAULT_DIMENSION,
    metric: DEFAULT_METRIC,
    cloud: DEFAULT_CLOUD,
    region: DEFAULT_REGION,
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

    if (arg === '-n' || arg === '--name') {
      const value = args[i + 1];
      if (!value) {
        console.error(`❌ Error: Index name is required`);
        process.exit(1);
      }
      config.indexName = value;
      i++;
      continue;
    }

    if (arg === '-d' || arg === '--dimension') {
      const value = parseInt(args[i + 1], 10);
      if (isNaN(value) || value <= 0) {
        console.error(`❌ Error: Dimension must be a positive number`);
        process.exit(1);
      }
      config.dimension = value;
      i++;
      continue;
    }

    if (arg === '-m' || arg === '--metric') {
      const value = args[i + 1].toLowerCase();
      if (!['cosine', 'euclidean', 'dotproduct'].includes(value)) {
        console.error(`❌ Error: Metric must be one of: cosine, euclidean, dotproduct`);
        process.exit(1);
      }
      config.metric = value as 'cosine' | 'euclidean' | 'dotproduct';
      i++;
      continue;
    }

    if (arg === '-c' || arg === '--cloud') {
      const value = args[i + 1].toLowerCase();
      if (!['aws', 'gcp', 'azure'].includes(value)) {
        console.error(`❌ Error: Cloud must be one of: aws, gcp, azure`);
        process.exit(1);
      }
      config.cloud = value;
      i++;
      continue;
    }

    if (arg === '-r' || arg === '--region') {
      const value = args[i + 1];
      if (!value) {
        console.error(`❌ Error: Region is required`);
        process.exit(1);
      }
      config.region = value;
      i++;
      continue;
    }
  }

  return config;
}

async function confirmCreation(config: CreateConfig): Promise<boolean> {
  console.log(`\n📋 Index Configuration:`);
  console.log(`   Name: ${config.indexName}`);
  console.log(`   Dimension: ${config.dimension}`);
  console.log(`   Metric: ${config.metric}`);
  console.log(`   Cloud: ${config.cloud}`);
  console.log(`   Region: ${config.region}`);
  console.log(`\n⚠️  This will create a NEW Pinecone index.`);
  console.log(`   If the index already exists, an error will be thrown.`);

  const answer = await askQuestion(`\n❓ Proceed with creation? (yes/no): `);
  return answer.trim().toLowerCase() === 'yes' || answer.trim().toLowerCase() === 'y';
}

async function createIndex(config: CreateConfig): Promise<void> {
  console.log(`\n🚀 Starting Pinecone index creation`);
  console.log(`📅 ${new Date().toLocaleString()}`);
  console.log('='.repeat(60));

  try {
    // Initialize Pinecone client
    if (!PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY environment variable is not set');
    }

    const pc = new Pinecone({
      apiKey: PINECONE_API_KEY
    });

    // Check if index already exists
    console.log(`\n🔍 Checking if index "${config.indexName}" already exists...`);
    const indexes = await pc.listIndexes();
    const indexExists = indexes.indexes?.some(idx => idx.name === config.indexName) || false;

    if (indexExists) {
      console.error(`❌ Error: Index "${config.indexName}" already exists!`);
      console.log(`\n📋 Available indexes:`);
      if (indexes.indexes && indexes.indexes.length > 0) {
        indexes.indexes.forEach(idx => console.log(`   - ${idx.name}`));
      } else {
        console.log(`   (No other indexes found)`);
      }
      console.log(`\n💡 To delete the existing index, run:`);
      console.log(`   npx tsx scripts/delete_pinecone_index.ts --index ${config.indexName}`);
      process.exit(1);
    }

    console.log(`✅ Index "${config.indexName}" does not exist. Ready to create.`);

    // Confirm creation (unless --yes flag is used)
    if (!config.yes) {
      const confirmed = await confirmCreation(config);
      if (!confirmed) {
        console.log('\n❌ Operation cancelled by user.');
        process.exit(0);
      }
    } else {
      console.log(`\n⚠️  Skipping confirmation (--yes flag provided)`);
    }

    // Create the index
    console.log(`\n🔄 Creating index "${config.indexName}"...`);
    const startTime = Date.now();

    await pc.createIndex({
      name: config.indexName,
      dimension: config.dimension,
      metric: config.metric,
      spec: {
        serverless: {
          cloud: config.cloud,
          region: config.region
        }
      }
    });

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`✅ Index "${config.indexName}" created successfully!`);
    console.log(`⏱️  Creation completed in ${elapsedTime} seconds`);

    // Wait for index to be ready
    console.log(`\n⏳ Waiting for index to initialize...`);
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Verify index is ready
    console.log(`\n🔍 Verifying index is ready...`);
    const verifyIndexes = await pc.listIndexes();
    const verifyExists = verifyIndexes.indexes?.some(idx => idx.name === config.indexName) || false;

    if (verifyExists) {
      console.log(`✅ Index "${config.indexName}" is ready!`);
    } else {
      console.log(`⚠️  Index "${config.indexName}" may not be ready yet. Please wait a moment and check.`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 INDEX CREATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`✅ Index: ${config.indexName}`);
    console.log(`✅ Status: Created successfully`);
    console.log(`📊 Dimension: ${config.dimension}`);
    console.log(`📊 Metric: ${config.metric}`);
    console.log(`☁️  Cloud: ${config.cloud}`);
    console.log(`🌍 Region: ${config.region}`);
    console.log(`⏱️  Time: ${elapsedTime} seconds`);
    console.log('='.repeat(60));

    console.log(`\n💡 You can now run the ingestion script:`);
    console.log(`   npx tsx scripts/chunkerize_presidents_data.ts --env-file .env.local`);

  } catch (error) {
    console.error('\n❌ Fatal error during index creation:', error);
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

    await createIndex(config);

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    rl.close();
    process.exit(1);
  }
})();
