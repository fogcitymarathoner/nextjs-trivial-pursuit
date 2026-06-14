import {DEBUG} from "@/config/env.server";
import {queryPinecone} from "@/lib/openai_answer_helpers";

import { Pinecone } from "@pinecone-database/pinecone";
import OpenAIClientManager from "@/lib/OpenAIClientManager";

if (!DEBUG) throw new Error("DEBUG is not set");

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pc.index(process.env.PINECONE_API_KEY!);


  // To run - npx tsx scripts/tst.mts
//console.log(client)
// above replaces dotenv -e .env.local -- tsx -r tsconfig-paths/register scripts/tst.ts
// simplying call to
  //  npx dotenv-cli -e .env.local -- tsx scripts/tst.ts
// npx tsx -r tsconfig-paths/register scripts/tst.ts
  // ; is necessary
;(async () => {
  if (process.env.DEBUG === 'true') {
    const result = await OpenAIClientManager.warmupChatCompletion()
    console.log(result)
  }
  else {
    await OpenAIClientManager.warmupChatCompletion()
  }

})()

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL;
if (!EMBEDDING_MODEL) throw new Error("EMBEDDING_MODEL is not set");
;(async () => {
  const result = await queryPinecone(
    "Hi");
  if (DEBUG === 'true')
    console.log(result)
})();
//console.log(getAnswer(client, "HI", 0.0))
