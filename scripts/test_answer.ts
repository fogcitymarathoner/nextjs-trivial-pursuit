import { getAnswer } from "@/lib/openai_answer_helpers";
import { DEFAULT_THRESHOLD } from "@/config/env";

// To run - npx tsx scripts/test_answer.ts [options]
// Examples:
//   npx tsx scripts/test_answer.ts                              # Uses default threshold 0.4, fallback ON
//   npx tsx scripts/test_answer.ts --threshold 0.7              # Uses threshold 0.7, fallback ON
//   npx tsx scripts/test_answer.ts --fallback false             # Disable fallback to general knowledge
//   npx tsx scripts/test_answer.ts -f false                     # Short form for fallback
//   npx tsx scripts/test_answer.ts --help                       # Shows help
//   npx tsx scripts/test_answer.ts -t 0.8                       # Short form for threshold

interface TestConfig {
  threshold: number;
  customQuestion?: string;
  showHelp: boolean;
  fallback: boolean;  // Add fallback flag
}

const MIN_THRESHOLD = 0.0;
const MAX_THRESHOLD = 1.0;

function showHelp(): void {
  console.log(`
📚 Test Answer Script - Help Guide
${"=".repeat(60)}

USAGE:
  npx tsx scripts/test_answer.ts [options]

OPTIONS:
  -t, --threshold <number>    Similarity threshold (default: ${DEFAULT_THRESHOLD})
                              Range: ${MIN_THRESHOLD} - ${MAX_THRESHOLD}
  
  -q, --question <string>     Single question to test (optional)
                              If not provided, runs default test questions
  
  -f, --fallback <boolean>    Allow fallback to general training knowledge when no context found
                              Values: true (default) or false
                              When false, refuses to answer without context
  
  -h, --help                  Show this help message

EXAMPLES:
  # Run with default threshold and fallback ON
  npx tsx scripts/test_answer.ts

  # Run with fallback OFF (no general knowledge)
  npx tsx scripts/test_answer.ts --fallback false
  npx tsx scripts/test_answer.ts -f false

  # Run with custom threshold and fallback OFF
  npx tsx scripts/test_answer.ts -t 0.7 -f false

  # Test a specific question with custom threshold and no fallback
  npx tsx scripts/test_answer.ts -t 0.6 -q "What is the capital of France?" -f false

  # Test a specific question with default threshold and fallback ON
  npx tsx scripts/test_answer.ts -q "Who wrote Romeo and Juliet?"

  # Show this help
  npx tsx scripts/test_answer.ts --help
  npx tsx scripts/test_answer.ts -h

NOTES:
  - Higher threshold = stricter matching (0.7-0.9)
  - Lower threshold = more results but potentially less relevant (0.1-0.3)
  - Default ${DEFAULT_THRESHOLD} is balanced for most use cases
  - Threshold must be between ${MIN_THRESHOLD} and ${MAX_THRESHOLD}
  - Fallback=true allows GPT to use its general knowledge when no context found
  - Fallback=false forces answers to come ONLY from provided context

${"=".repeat(60)}
  `);
}

function parseArguments(): TestConfig {
  const args = process.argv.slice(2);
  const config: TestConfig = {
    threshold: Number(DEFAULT_THRESHOLD),
    showHelp: false,
    fallback: false  // Default to false
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

  console.log(`\n🎯 Running tests with:`);
  console.log(`   📊 Similarity threshold: ${config.threshold}`);
  console.log(`   🔄 Fallback to general knowledge: ${config.fallback ? 'ON' : 'OFF'}`);
  console.log(`📊 Range: ${MIN_THRESHOLD} - ${MAX_THRESHOLD} | Default threshold: ${DEFAULT_THRESHOLD}`);
  console.log("=".repeat(80));

  let successCount = 0;
  let failCount = 0;

  for (const question of questions) {
    try {
      console.log(`\n📝 Question: ${question}`);
      console.log("⏳ Generating answer...");

      // Pass fallback parameter to getAnswer
      const answer = await getAnswer(question, config.threshold, config.fallback);

      console.log(`\n✅ Answer: ${answer}`);
      console.log(`📊 Used threshold: ${config.threshold}`);
      console.log(`🔄 Fallback mode: ${config.fallback ? 'Allowed' : 'Disabled'}`);
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