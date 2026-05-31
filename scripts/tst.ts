import '../src/config/env'
import {DEBUG} from "@/src/config/env";
import {warmupChatCompletion} from "@/lib/openai";

  // To run - npx tsx scripts/tst.ts
//console.log(client)
// above replaces dotenv -e .env.local -- tsx -r tsconfig-paths/register scripts/tst.ts
// simplying call to
  //  npx dotenv-cli -e .env.local -- tsx scripts/tst.ts
// npx tsx -r tsconfig-paths/register scripts/tst.ts
  // ; is necessary
;(async () => {
  if (DEBUG === 'true') {
    const result = await warmupChatCompletion()
    console.log(result)
  }
  else {
    await warmupChatCompletion()
  }

})()

