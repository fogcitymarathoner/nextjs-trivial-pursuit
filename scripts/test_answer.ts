import { getAnswer } from "@/lib/openai_answer_helpers";

// To run - npx tsx scripts/test_answer.ts
async function testGetAnswer() {
  try {
    // Test questions
    const testQuestions = [
      "What is the capital of France?",
      "Who wrote Romeo and Juliet?",
      "What year did World War II end?",
      "When was VE day?",
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