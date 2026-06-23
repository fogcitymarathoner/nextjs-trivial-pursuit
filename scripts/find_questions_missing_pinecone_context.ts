// scripts/find_questions_missing_pinecone_context.ts

// To run - npx tsx scripts/find_questions_missing_pinecone_context.ts --env-file .env.local [options]

import { getResultsFromVectorDB } from "@/lib/openai_answer_helpers";
import { PINECONE_INDEXES, getIndexNameByLabel } from "@/config/pinecone/pinecone_indexes";
import { questions, type Question } from "@/data/presidents_questions";
import readline from 'readline';
import fs from 'fs';
import path from 'path';

// Examples:
//   npx tsx scripts/find_questions_missing_pinecone_context.ts                              # Uses default threshold 0.5, default index
//   npx tsx scripts/find_questions_missing_pinecone_context.ts --threshold 0.7              # Uses threshold 0.7
//   npx tsx scripts/find_questions_missing_pinecone_context.ts --pinecone-index documents   # Use specific Pinecone index
//   npx tsx scripts/find_questions_missing_pinecone_context.ts -p presidents                # Short form for pinecone index
//   npx tsx scripts/find_questions_missing_pinecone_context.ts --help                       # Shows help
//   npx tsx scripts/find_questions_missing_pinecone_context.ts -t 0.8                       # Short form for threshold
//   npx tsx scripts/find_questions_missing_pinecone_context.ts --yes                        # Skip all prompts (non-interactive mode)
//   npx tsx scripts/find_questions_missing_pinecone_context.ts --output results.json        # Save missing questions to JSON file

interface TestConfig {
  threshold: number;
  showHelp: boolean;
  pineconeIndexLabel: string;
  yes: boolean;
  outputFile?: string;
  questionIds?: number[]; // Optional: test specific question IDs
}

interface MissingQuestion {
  id: number;
  category: string;
  question: string;
  matchesFound: number;
  threshold: number;
  indexUsed: string;
}

const MIN_THRESHOLD = 0.0;
const MAX_THRESHOLD = 1.0;
const DEFAULT_THRESHOLD = 0.5;

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
📚 Find Questions Missing Pinecone Context - Help Guide
${"=".repeat(60)}

USAGE:
  npx tsx scripts/find_questions_missing_pinecone_context.ts [options]

OPTIONS:
  -t, --threshold <number>    Similarity threshold (default: ${DEFAULT_THRESHOLD})
                              Range: ${MIN_THRESHOLD} - ${MAX_THRESHOLD}
  
  -p, --pinecone-index <string>  Pinecone index label or name to query (default: ${DEFAULT_INDEX_LABEL})
                              Available indexes: ${AVAILABLE_INDEXES}
  
  -y, --yes                   Skip all prompts (non-interactive mode)
  
  -o, --output <filename>     Save missing questions to a JSON file (e.g., --output missing-questions.json)
  
  -i, --ids <numbers>         Test specific question IDs (comma-separated, e.g., --ids 1,5,10,25)
  
  -h, --help                  Show this help message

EXAMPLES:
  # Run all questions with default settings
  npx tsx scripts/find_questions_missing_pinecone_context.ts

  # Test specific questions
  npx tsx scripts/find_questions_missing_pinecone_context.ts --ids 1,5,10,25

  # Save missing questions to file
  npx tsx scripts/find_questions_missing_pinecone_context.ts --output missing-questions.json

  # Use a specific Pinecone index
  npx tsx scripts/find_questions_missing_pinecone_context.ts --pinecone-index presidents

  # Test specific questions and save failures
  npx tsx scripts/find_questions_missing_pinecone_context.ts --ids 1,5,10 --output missing.json

  # Show this help
  npx tsx scripts/find_questions_missing_pinecone_context.ts --help

${"=".repeat(60)}
  `);
}

function parseArguments(): TestConfig {
  const args = process.argv.slice(2);
  const config: TestConfig = {
    threshold: DEFAULT_THRESHOLD,
    showHelp: false,
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
      i++;
      continue;
    }

    if (arg === '-p' || arg === '--pinecone-index') {
      const indexInput = args[i + 1];
      if (!indexInput) {
        console.error(`❌ Error: Pinecone index name is required`);
        process.exit(1);
      }

      const indexConfig = findIndexByInput(indexInput);
      if (!indexConfig) {
        console.error(`❌ Error: Invalid pinecone index '${indexInput}'`);
        console.log(`   Available indexes: ${AVAILABLE_INDEXES}`);
        process.exit(1);
      }

      config.pineconeIndexLabel = indexConfig.label;
      i++;
      continue;
    }

    if (arg === '-o' || arg === '--output') {
      config.outputFile = args[i + 1];
      i++;
      continue;
    }

    if (arg === '-i' || arg === '--ids') {
      const idsStr = args[i + 1];
      if (!idsStr) {
        console.error(`❌ Error: Question IDs are required`);
        process.exit(1);
      }
      config.questionIds = idsStr.split(',').map(id => parseInt(id.trim(), 10));
      if (config.questionIds.some(isNaN)) {
        console.error(`❌ Error: Invalid question IDs. Use comma-separated numbers (e.g., 1,5,10)`);
        process.exit(1);
      }
      i++;
      continue;
    }
  }

  return config;
}

async function handleQuestion(
  question: Question,
  config: TestConfig,
  indexName: string
): Promise<{ hasMatches: boolean; matchCount: number; error?: string }> {
  console.log(`⏳ Querying Pinecone with threshold ${config.threshold}...`);

  try {
    const queryResult = await getResultsFromVectorDB(
      question.question,
      config.threshold,
      indexName
    );

    const matchCount = queryResult?.matches?.length || 0;
    const hasMatches = matchCount > 0;

    if (hasMatches) {
      console.log(`✅ Found ${matchCount} context matches at threshold ${config.threshold}`);
    } else {
      console.log(`❌ No context matches found at threshold ${config.threshold}`);
    }

    return { hasMatches, matchCount };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error querying Pinecone: ${errorMsg}`);
    return { hasMatches: false, matchCount: 0, error: errorMsg };
  }
}

async function runTests(config: TestConfig): Promise<void> {
  // Filter questions if specific IDs are provided
  let testQuestions: Question[];
  if (config.questionIds && config.questionIds.length > 0) {
    testQuestions = questions.filter(q => config.questionIds!.includes(q.id));
    if (testQuestions.length === 0) {
      console.error(`❌ No questions found with IDs: ${config.questionIds.join(', ')}`);
      console.log(`   Available question IDs: 1-${questions.length}`);
      process.exit(1);
    }
    console.log(`\n📋 Testing ${testQuestions.length} specific questions (IDs: ${config.questionIds.join(', ')})`);
  } else {
    testQuestions = questions;
    console.log(`\n📋 Testing all ${testQuestions.length} questions`);
  }

  // Get the index configuration for display
  const indexName = getIndexNameByLabel(config.pineconeIndexLabel);
  if (!indexName) {
    throw new Error(`No Pinecone index configured for label "${config.pineconeIndexLabel}"`);
  }

  console.log(`\n🎯 Running tests with:`);
  console.log(`   📊 Similarity threshold: ${config.threshold}`);
  console.log(`   🗄️  Pinecone index: ${config.pineconeIndexLabel} (${indexName})`);
  console.log(`   🤖 Non-interactive mode: ${config.yes ? 'ON' : 'OFF'}`);
  if (config.outputFile) {
    console.log(`   📝 Output file: ${config.outputFile}`);
  }
  console.log(`📊 Range: ${MIN_THRESHOLD} - ${MAX_THRESHOLD} | Default threshold: ${DEFAULT_THRESHOLD}`);
  console.log("=".repeat(80));

  let foundCount = 0;
  let missingCount = 0;
  let errorCount = 0;
  const missingQuestions: MissingQuestion[] = [];

  for (const question of testQuestions) {
    try {
      console.log(`\n📝 [Q${question.id}] ${question.question}`);
      console.log(`   📂 Category: ${question.category}`);

      const result = await handleQuestion(question, config, indexName);

      if (result.error) {
        errorCount++;
        console.log(`⚠️  Error for Q${question.id}: ${result.error}`);
      } else if (result.hasMatches) {
        foundCount++;
        console.log(`✅ Found context for Q${question.id}`);
      } else {
        missingCount++;
        missingQuestions.push({
          id: question.id,
          category: question.category,
          question: question.question,
          matchesFound: 0,
          threshold: config.threshold,
          indexUsed: indexName
        });
        console.log(`❌ No context found for Q${question.id} at threshold ${config.threshold}`);
      }
    } catch (error) {
      console.error(`\n❌ Failed to query for Q${question.id}: ${question.question}`);
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`Error: ${errorMsg}`);
      errorCount++;
      missingQuestions.push({
        id: question.id,
        category: question.category,
        question: question.question,
        matchesFound: 0,
        threshold: config.threshold,
        indexUsed: indexName
      });
    }
    console.log("\n" + "-".repeat(60));
  }

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(80));
  console.log(`✅ Found context: ${foundCount}`);
  console.log(`❌ Missing context: ${missingCount}`);
  console.log(`⚠️  Errors: ${errorCount}`);
  console.log(`🎯 Threshold used: ${config.threshold}`);
  console.log(`🗄️  Pinecone index: ${config.pineconeIndexLabel} (${indexName})`);
  console.log(`📝 Total questions: ${testQuestions.length}`);
  console.log("=".repeat(80));

  // Output missing questions if any
  if (missingQuestions.length > 0) {
    console.log(`\n❌ Questions Missing Pinecone Context (${missingQuestions.length}):`);
    console.log("-".repeat(60));
    missingQuestions.forEach((mq, idx) => {
      console.log(`${idx + 1}. [Q${mq.id}] ${mq.question}`);
      console.log(`   Category: ${mq.category}`);
      console.log(`   Threshold: ${mq.threshold}`);
      console.log();
    });

    // Save to file if output option is provided
    if (config.outputFile) {
      const outputPath = path.resolve(process.cwd(), config.outputFile);
      try {
        const outputData = {
          generatedAt: new Date().toISOString(),
          totalQuestions: testQuestions.length,
          foundContext: foundCount,
          missingContext: missingCount,
          errors: errorCount,
          config: {
            threshold: config.threshold,
            pineconeIndex: config.pineconeIndexLabel,
            nonInteractive: config.yes
          },
          missingQuestions: missingQuestions
        };
        fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
        console.log(`💾 Missing questions saved to: ${outputPath}`);
      } catch (error) {
        console.error(`❌ Error saving output file: ${error}`);
      }
    }

    console.log(`\n⚠️  ${missingQuestions.length} questions are missing context in Pinecone at threshold ${config.threshold}.`);
  } else {
    console.log("\n✨ All questions have context in Pinecone!");
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

    console.log(`\n🚀 Finding Questions Missing Pinecone Context`);
    console.log(`📅 ${new Date().toLocaleString()}`);

    await runTests(config);

  } catch (error) {
    console.error("\n❌ Fatal error during testing:", error);
    console.log("\n💡 Tip: Run with --help to see usage instructions");
    rl.close();
    process.exit(1);
  }
})();