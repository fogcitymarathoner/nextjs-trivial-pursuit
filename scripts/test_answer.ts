// test_answer.ts

import { getAnswer, getResultsFromVectorDB } from "@/lib/openai_answer_helpers";
import { PINECONE_INDEXES, getIndexNameByLabel } from "@/config/pinecone/pinecone_indexes";
import readline from 'readline';


// Examples:
//   npx tsx scripts/test_answer.ts                              # Uses default threshold 0.4, fallback ON, default index
//   npx tsx scripts/test_answer.ts --threshold 0.7              # Uses threshold 0.7, fallback ON, default index
//   npx tsx scripts/test_answer.ts --fallback false             # Disable fallback to general knowledge (will prompt user)
//   npx tsx scripts/test_answer.ts -f false                     # Short form for fallback
//   npx tsx scripts/test_answer.ts --pinecone-index documents   # Use specific Pinecone index
//   npx tsx scripts/test_answer.ts -p presidents                # Short form for pinecone index
//   npx tsx scripts/test_answer.ts --help                       # Shows help
//   npx tsx scripts/test_answer.ts -t 0.8                       # Short form for threshold
//   npx tsx scripts/test_answer.ts --yes                        # Skip all prompts (non-interactive mode)

interface TestConfig {
  threshold: number;
  customQuestion?: string;
  showHelp: boolean;
  fallback: boolean;
  pineconeIndexLabel: string;
  yes: boolean;  // Skip all prompts (non-interactive mode)
}

const MIN_THRESHOLD = 0.0;
const MAX_THRESHOLD = 1.0;

// Get available indexes for help display
const AVAILABLE_INDEXES = PINECONE_INDEXES.map(idx => `${idx.label} (${idx.indexName})`).join(', ');
const DEFAULT_INDEX_LABEL = PINECONE_INDEXES[0]?.label || 'Presidents';

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
                              When false, WILL PROMPT YOU to choose what to do
  
  -p, --pinecone-index <string>  Pinecone index label or name to query (default: ${DEFAULT_INDEX_LABEL})
                              Available indexes: ${AVAILABLE_INDEXES}
  
  -y, --yes                   Skip all prompts (non-interactive mode) - will skip questions when no context found
  
  -h, --help                  Show this help message

EXAMPLES:
  # Run with default settings (fallback ON, will use general knowledge)
  npx tsx scripts/test_answer.ts

  # Disable fallback (will PROMPT you when no context found)
  npx tsx scripts/test_answer.ts --fallback false

  # Disable fallback and auto-skip (non-interactive)
  npx tsx scripts/test_answer.ts --fallback false --yes

  # Use a specific Pinecone index
  npx tsx scripts/test_answer.ts --pinecone-index presidents
  npx tsx scripts/test_answer.ts -p documents

  # Run with custom threshold and fallback disabled (will prompt)
  npx tsx scripts/test_answer.ts -t 0.7 -p presidents -f false

  # Test a specific question with fallback disabled (will prompt)
  npx tsx scripts/test_answer.ts -q "Who wrote Romeo and Juliet?" -f false

  # Auto-skip when no context found
  npx tsx scripts/test_answer.ts -q "Who wrote Romeo and Juliet?" -f false --yes

  # Show this help
  npx tsx scripts/test_answer.ts --help
  npx tsx scripts/test_answer.ts -h

NOTES:
  - Higher threshold = stricter matching (0.7-0.9)
  - Lower threshold = more results but potentially less relevant (0.1-0.3)
  - Default ${process.env.DEFAULT_THRESHOLD} is balanced for most use cases
  - When fallback=false, you will be prompted to choose what to do (unless --yes is used)
  - Options when prompted: use general knowledge, skip, or retry with different threshold

${"=".repeat(60)}
  `);
}

function parseArguments(): TestConfig {
  const args = process.argv.slice(2);
  const config: TestConfig = {
    threshold: Number(process.env.DEFAULT_THRESHOLD),
    showHelp: false,
    fallback: true,
    pineconeIndexLabel: DEFAULT_INDEX_LABEL,
    yes: false
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

async function askUserForAction(
  question: string,
  config: TestConfig,
  indexName: string
): Promise<{ action: 'use_fallback' | 'skip' | 'retry_lower' | 'retry_higher'; newThreshold?: number }> {
  console.log(`\n⚠️  No relevant context found in "${config.pineconeIndexLabel}" (${indexName}) at threshold ${config.threshold}`);

  console.log(`\n📋 What would you like to do?`);
  console.log(`   1. Use general knowledge to answer this question (temporary fallback)`);
  console.log(`   2. Skip this question`);
  console.log(`   3. Retry with a LOWER threshold (${Math.max(0, config.threshold - 0.2).toFixed(1)})`);
  console.log(`   4. Retry with a HIGHER threshold (${Math.min(1, config.threshold + 0.2).toFixed(1)})`);

  const answer = await askQuestion(`\n❓ Your choice (1-4): `);

  switch (answer.trim()) {
    case '1':
      return { action: 'use_fallback' };
    case '2':
      return { action: 'skip' };
    case '3':
      return { action: 'retry_lower', newThreshold: Math.max(0, config.threshold - 0.2) };
    case '4':
      return { action: 'retry_higher', newThreshold: Math.min(1, config.threshold + 0.2) };
    default:
      console.log(`❌ Invalid option. Please choose 1-4.`);
      return await askUserForAction(question, config, indexName);
  }
}

async function handleQuestionWithRetry(
  question: string,
  config: TestConfig,
  indexName: string,
  currentThreshold: number
): Promise<{ success: boolean; answer?: string; skip: boolean }> {
  // Query with current threshold
  console.log(`⏳ Querying Pinecone with threshold ${currentThreshold}...`);
  let queryResult = await getResultsFromVectorDB(question, currentThreshold, indexName);
  let hasMatches = queryResult?.matches?.length > 0;

  // If we have matches, answer directly
  if (hasMatches) {
    console.log(`✅ Found ${queryResult.matches.length} context matches at threshold ${currentThreshold}`);
    console.log("⏳ Generating answer...");
    const answer = await getAnswer(
      question,
      currentThreshold,
      config.fallback,
      config.pineconeIndexLabel,
      queryResult
    );
    return { success: true, answer, skip: false };
  }

  // No matches found

  // If fallback is ON, just use general knowledge
  if (config.fallback) {
    console.log(`⚠️  No relevant context found at threshold ${currentThreshold}`);
    console.log(`🔄 Fallback is ON - using general knowledge\n`);
    const answer = await getAnswer(
      question,
      currentThreshold,
      true,
      config.pineconeIndexLabel,
      null
    );
    return { success: true, answer, skip: false };
  }

  // Fallback is OFF - we need to ask the user (unless --yes flag is used)
  if (config.yes) {
    // Non-interactive mode - just skip
    console.log(`⚠️  No relevant context found in "${config.pineconeIndexLabel}" (${indexName}) at threshold ${currentThreshold}`);
    console.log(`❌ Skipping question (--yes flag enabled, non-interactive mode)\n`);
    return { success: false, skip: true };
  }

  // Interactive mode - ask the user what to do
  const userAction = await askUserForAction(question, { ...config, threshold: currentThreshold }, indexName);

  switch (userAction.action) {
    case 'use_fallback':
      console.log(`🔄 Using general knowledge for this question...`);
      const answer = await getAnswer(
        question,
        currentThreshold,
        true, // Temporarily enable fallback
        config.pineconeIndexLabel,
        null
      );
      return { success: true, answer, skip: false };

    case 'skip':
      console.log(`⏭️  Skipping question...`);
      return { success: false, skip: true };

    case 'retry_lower':
      console.log(`🔄 Retrying with lower threshold: ${userAction.newThreshold}`);
      return await handleQuestionWithRetry(question, config, indexName, userAction.newThreshold!);

    case 'retry_higher':
      console.log(`🔄 Retrying with higher threshold: ${userAction.newThreshold}`);
      return await handleQuestionWithRetry(question, config, indexName, userAction.newThreshold!);
  }
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
  if (!indexName) {
    throw new Error(`No Pinecone index configured for label "${config.pineconeIndexLabel}"`);
  }

  console.log(`\n🎯 Running tests with:`);
  console.log(`   📊 Similarity threshold: ${config.threshold}`);
  console.log(`   🔄 Fallback to general knowledge: ${config.fallback ? 'ON (auto)' : 'OFF (will prompt)'}`);
  console.log(`   🗄️  Pinecone index: ${config.pineconeIndexLabel} (${indexName})`);
  console.log(`   🤖 Non-interactive mode: ${config.yes ? 'ON (auto-skip)' : 'OFF (will ask)'}`);
  console.log(`📊 Range: ${MIN_THRESHOLD} - ${MAX_THRESHOLD} | Default threshold: ${process.env.DEFAULT_THRESHOLD}`);
  console.log("=".repeat(80));

  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (const question of questions) {
    try {
      console.log(`\n📝 Question: ${question}`);

      const result = await handleQuestionWithRetry(question, config, indexName, config.threshold);

      if (result.skip) {
        skipCount++;
      } else if (result.success && result.answer) {
        console.log(`\n✅ Answer: ${result.answer}`);
        console.log(`📊 Final threshold used: ${config.threshold}`);
        console.log(`🔄 Fallback mode: ${config.fallback ? 'ON' : 'OFF (user chose temporary fallback)'}`);
        console.log(`🗄️  Used index: ${config.pineconeIndexLabel} (${indexName})`);
        console.log(`📏 Answer length: ${result.answer.length} characters`);
        successCount++;
      } else {
        failCount++;
      }
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
  console.log(`⏭️  Skipped: ${skipCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`🎯 Threshold used: ${config.threshold}`);
  console.log(`🔄 Fallback mode: ${config.fallback ? 'ON (auto general knowledge)' : 'OFF (interactive prompts)'}`);
  console.log(`🗄️  Pinecone index: ${config.pineconeIndexLabel} (${indexName})`);
  console.log(`🤖 Non-interactive mode: ${config.yes ? 'ON' : 'OFF'}`);
  console.log(`📝 Total questions: ${questions.length}`);
  console.log("=".repeat(80));

  if (failCount > 0) {
    console.log("\n⚠️  Some tests failed. Check the errors above.");
  } else if (skipCount > 0) {
    console.log("\n⚠️  Some questions were skipped due to no context and user choice.");
  } else {
    console.log("\n✨ All tests completed successfully!");
  }

  // Close readline interface
  rl.close();
}

// Main execution
(async () => {
  try {
    const config = parseArguments();

    if (config.showHelp) {
      showHelp();
      rl.close();
      process.exit(0);
    }

    console.log(`\n🚀 Starting Answer Test Script`);
    console.log(`📅 ${new Date().toLocaleString()}`);

    await runTests(config);

  } catch (error) {
    console.error("\n❌ Fatal error during testing:", error);
    console.log("\n💡 Tip: Run with --help to see usage instructions");
    rl.close();
    process.exit(1);
  }
})();
