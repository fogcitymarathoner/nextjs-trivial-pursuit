import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import { getAnswer } from "../lib/openai_answer_helpers";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: '.env.local' });
// To run - npx tsx scripts/test_answer.ts
async function testGetAnswer() {
  try {
    // Initialize Pinecone
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_TOKEN!,
    });

    // Get the index
    const indexName = process.env.PINECONE_INDEX_DEV || "presidents-dev";
    const index = pinecone.index(indexName);

    // Initialize OpenAI
    const openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    // Test parameters
    const embeddingModel = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
    const chatModel = process.env.CHAT_MODEL || "gpt-4o-mini";
    
    // Test questions
    const testQuestions = [
      "What is the capital of France?",
      "Who wrote Romeo and Juliet?",
      "What year did World War II end?",
    ];

    console.log("Testing getAnswer function...\n");

    for (const question of testQuestions) {
      console.log(`\n📝 Question: ${question}`);
      console.log("⏳ Generating answer...");
      
      const answer = await getAnswer(
        question
      );

      console.log(`\n✅ Answer: ${answer}\n`);
      console.log("=" .repeat(80));
    }

    console.log("\n✨ All tests completed successfully!");

  } catch (error) {
    console.error("❌ Error during testing:", error);
    process.exit(1);
  }
}

// Run the test
testGetAnswer();