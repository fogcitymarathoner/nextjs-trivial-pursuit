import './env'
import {queryPinecone} from "@/lib/openai_answer_helpers";

import { Pinecone } from "@pinecone-database/pinecone";
import {warmupChatCompletion} from "@/lib/openai";

const DEBUG = process.env.DEBUG;
if (!DEBUG) throw new Error("DEBUG is not set");

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_TOKEN! });
const index = pc.index(process.env.PINECONE_INDEX_DEV!);


  // To run - npx tsx scripts/tst.mts
//console.log(client)
// above replaces dotenv -e .env.local -- tsx -r tsconfig-paths/register scripts/tst.ts
// simplying call to
  //  npx dotenv-cli -e .env.local -- tsx scripts/tst.ts
// npx tsx -r tsconfig-paths/register scripts/tst.ts
  // ; is necessary
;(async () => {
  if (process.env.DEBUG === 'true') {
    const result = await warmupChatCompletion()
    console.log(result)
  }
  else {
    await warmupChatCompletion()
  }

})()

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL;
if (!EMBEDDING_MODEL) throw new Error("EMBEDDING_MODEL is not set");
;(async () => {
  const result = await queryPinecone(
    "Hi");
  if (DEBUG)
    console.log(result)
})();
//console.log(getAnswer(client, "HI", 0.0))
