import './env'
import {warmupChatCompletion, getOpenAIEmbedding, queryPinecone} from "@/lib/openai_answer_helpers";
import OpenAI from 'openai'
import { Pinecone } from "@pinecone-database/pinecone";

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_TOKEN! });
const index = pc.index(process.env.PINECONE_INDEX_DEV!);


const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  // To run - npx tsx scripts/tst.mts
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
  const question_embedding = await getOpenAIEmbedding(client, "hi", process.env.EMBEDDING_MODEL);
  console.log(question_embedding)
})();

;(async () => {
  const result = await queryPinecone("Hi", process.env.EMBEDDING_MODEL,
    index, new OpenAI(process.env.OPENAI_API_KEY), false);
  console.log(result)
})();
//console.log(getAnswer(client, "HI", 0.0))
