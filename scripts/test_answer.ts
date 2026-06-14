import { getAnswer } from "@/lib/openai_answer_helpers";
import { PINECONE_INDEXES, getIndexNameByLabel } from "@/config/pinecone/pinecone_indexes";

// To run - npx tsx scripts/test_answer.ts --env-file .env.local [options]
// Examples:
//   npx tsx scripts/test_answer.ts                              # Uses default threshold 0.4, fallback ON, default index
//   npx tsx scripts/test_answer.ts --threshold 0.7              # Uses threshold 0.7, fallback ON, default index
//   npx tsx scripts/test_answer.ts --fallback false             # Disable fallback to general knowledge
//   npx tsx scripts/test_answer.ts -f false                     # Short form for fallback
//   npx tsx scripts/test_answer.ts --pinecone-index documents   # Use specific Pinecone index
//   npx tsx scripts/test_answer.ts -p presidents                # Short form for pinecone index
//   npx tsx scripts/test_answer.ts --help                       # Shows help
//   npx tsx scripts/test_answer.ts -t 0.8                       # Short form for threshold

interface TestConfig {
  threshold: number;
  customQuestion?: string;
  showHelp: boolean;
  fallback: boolean;
  pineconeIndexLabel: string;
}

const MIN_THRESHOLD = 0.0;
const MAX_THRESHOLD = 1.0;

// Get available indexes for help display
const AVAILABLE_INDEXES = PINECONE_INDEXES.map(idx => `${idx.label} (${idx.indexName})`).join(', ');
const DEFAULT_INDEX_LABEL = PINECONE_INDEXES[0]?.label || 'Presidents';

function findIndexByInput(input: string) {
  return PINECONE_INDEXES.find(index => index.label === input || index.indexName === input);
}

function showHelp(): void {
  console.log(`
📚 Test Answer Script - Help Guide
${"=".repeat(60)}

USAGE:
  npx tsx scripts/test_answer.ts [options]

OPTIONS:
  -t, --threshold <number>    Similarity threshold (default: ${process.env.DEFAULT_THRESHOLD})
                              Range: ${MIN_THRESHOLD} - ${MAX_THRESHOLD}
  
  -q, --question <string>     Single question to test (optional)
                              If not provided, runs default test questions
  
  -f, --fallback <boolean>    Allow fallback to general training knowledge when no context found
                              Values: true (default) or false
                              When false, refuses to answer without context
  
  -p, --pinecone-index <string>  Pinecone index label or name to query (default: ${DEFAULT_INDEX_LABEL})
                              Available indexes: ${AVAILABLE_INDEXES}
  
  -h, --help                  Show this help message

EXAMPLES:
  # Run with default settings (default index)
  npx tsx scripts/test_answer.ts

  # Use a specific Pinecone index
  npx tsx scripts/test_answer.ts --pinecone-index presidents
  npx tsx scripts/test_answer.ts -p documents

  # Run with fallback OFF and specific index
  npx tsx scripts/test_answer.ts --fallback false --pinecone-index presidents

  # Run with custom threshold, specific index, and fallback OFF
  npx tsx scripts/test_answer.ts -t 0.7 -p presidents -f false

  # Test a specific question with custom index and no fallback
  npx tsx scripts/test_answer.ts -t 0.6 -q "What is the capital of France?" -f false -p documents

  # Test a specific question with default threshold and fallback ON
  npx tsx scripts/test_answer.ts -q "Who wrote Romeo and Juliet?"

  # Show this help
  npx tsx scripts/test_answer.ts --help
  npx tsx scripts/test_answer.ts -h

NOTES:
  - Higher threshold = stricter matching (0.7-0.9)
  - Lower threshold = more results but potentially less relevant (0.1-0.3)
  - Default ${process.env.DEFAULT_THRESHOLD} is balanced for most use cases
  - Threshold must be between ${MIN_THRESHOLD} and ${MAX_THRESHOLD}
  - Fallback=true allows GPT to use its general knowledge when no context found
  - Fallback=false forces answers to come ONLY from provided context
  - Pinecone index determines which vector database to query for context

${"=".repeat(60)}
  `);
}

function parseArguments(): TestConfig {
  const args = process.argv.slice(2);
  const config: TestConfig = {
    threshold: Number(process.env.DEFAULT_THRESHOLD),
    showHelp: false,
    fallback: false,
    pineconeIndexLabel: DEFAULT_INDEX_LABEL
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      config.showHelp = true;
      return config;
    }

    if (arg === '-t' || arg === '--threshold') {
      const value = parseFloat(args[i + 1]);
      if (isNaN(value) || value < MIN_THRESHOLD || value > MAX_THRESHOLD) {
        console.error(`❌ Error: Threshold must be a number between ${MIN_THRESHOLD} and ${MAX_THRESHOLD}`);
        process.exit(1);
      }
      config.threshold = value;
      i++; // Skip next argument
      continue;
    }

    if (arg === '-f' || arg === '--fallback') {
      const value = args[i + 1].toLowerCase();
      if (value === 'false' || value === '0' || value === 'no') {
        config.fallback = false;
      } else if (value === 'true' || value === '1' || value === 'yes') {
        config.fallback = true;
      } else {
        console.error(`❌ Error: Fallback must be true or false`);
        process.exit(1);
      }
      i++; // Skip next argument
      continue;
    }

    if (arg === '-p' || arg === '--pinecone-index') {
      const indexInput = args[i + 1];
      if (!indexInput) {
        console.error(`❌ Error: Pinecone index name is required`);
        process.exit(1);
      }

      // Validate the index exists
      const indexConfig = findIndexByInput(indexInput);
      if (!indexConfig) {
        console.error(`❌ Error: Invalid pinecone index '${indexInput}'`);
        console.log(`   Available indexes: ${AVAILABLE_INDEXES}`);
        process.exit(1);
      }

      config.pineconeIndexLabel = indexConfig.label;
      i++; // Skip next argument
      continue;
    }

    if (arg === '-q' || arg === '--question') {
      config.customQuestion = args[i + 1];
      i++; // Skip next argument
      continue;
    }
  }

  return config;
}

async function runTests(config: TestConfig): Promise<void> {
  const defaultTestQuestions = [
    "What is the capital of France?",
    "Who wrote Romeo and Juliet?",
    "What year did World War II end?",
    "When was VE day?",
    "What did Calvin Coolidge say about the tax policy?"
  ];

  const questions = config.customQuestion ? [config.customQuestion] : defaultTestQuestions;

  // Get the index configuration for display
  const indexName = getIndexNameByLabel(config.pineconeIndexLabel);

  console.log(`\n🎯 Running tests with:`);
  console.log(`   📊 Similarity threshold: ${config.threshold}`);
  console.log(`   🔄 Fallback to general knowledge: ${config.fallback ? 'ON' : 'OFF'}`);
  console.log(`   🗄️  Pinecone index: ${config.pineconeIndexLabel} (${indexName})`);
  console.log(`📊 Range: ${MIN_THRESHOLD} - ${MAX_THRESHOLD} | Default threshold: ${process.env.DEFAULT_THRESHOLD}`);
  console.log("=".repeat(80));

  let successCount = 0;
  let failCount = 0;

  for (const question of questions) {
    try {
      console.log(`\n📝 Question: ${question}`);
      console.log("⏳ Generating answer...");

      // Pass fallback parameter and pinecone index to getAnswer
      // Assuming getAnswer signature is: getAnswer(question, threshold, fallback, pineconeIndex?)
      const answer = await getAnswer(
        question,
        config.threshold,
        config.fallback,
        config.pineconeIndexLabel
      );

      console.log(`\n✅ Answer: ${answer}`);
      console.log(`📊 Used threshold: ${config.threshold}`);
      console.log(`🔄 Fallback mode: ${config.fallback ? 'Allowed' : 'Disabled'}`);
      console.log(`🗄️  Used index: ${config.pineconeIndexLabel} (${indexName})`);
      console.log(`📏 Answer length: ${answer.length} characters`);
      successCount++;
    } catch (error) {
      console.error(`\n❌ Failed to get answer for: ${question}`);
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      failCount++;
    }
    console.log("\n" + "-".repeat(60));
  }

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(80));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`🎯 Threshold used: ${config.threshold}`);
  console.log(`🔄 Fallback mode: ${config.fallback ? 'ON (general knowledge allowed)' : 'OFF (context only)'}`);
  console.log(`🗄️  Pinecone index: ${config.pineconeIndexLabel} (${indexName})`);
  console.log(`📝 Total questions: ${questions.length}`);
  console.log("=".repeat(80));

  if (failCount > 0) {
    console.log("\n⚠️  Some tests failed. Check the errors above.");
  } else {
    console.log("\n✨ All tests completed successfully!");
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

    console.log(`\n🚀 Starting Answer Test Script`);
    console.log(`📅 ${new Date().toLocaleString()}`);

    await runTests(config);

  } catch (error) {
    console.error("\n❌ Fatal error during testing:", error);
    console.log("\n💡 Tip: Run with --help to see usage instructions");
    process.exit(1);
  }
})();
