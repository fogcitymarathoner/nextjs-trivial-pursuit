import './env'
import {warmupChatCompletion, getOpenAIEmbedding} from "@/lib/openai_answer_helpers";
import OpenAI from 'openai'
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  // To run - npx tsx scripts/tst.ts
//console.log(client)
// above replaces dotenv -e .env.local -- tsx -r tsconfig-paths/register scripts/tst.ts
// simplying call to
  //  npx dotenv-cli -e .env.local -- tsx scripts/tst.ts
// npx tsx -r tsconfig-paths/register scripts/tst.ts
  // ; is necessary
;(async () => {
  if (process.env.DEBUG === 'true') {
    const result = await warmupChatCompletion(client)
    console.log(result)
  }
  else {
    await warmupChatCompletion(client)
  }

})()

;(async () => {
  const result = await getOpenAIEmbedding(client, "hi", process.env.EMBEDDING_MODEL);
  console.log(result)
})();
//console.log(getAnswer(client, "HI", 0.0))
