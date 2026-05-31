// Removes need for dotenv-cli -e .env.local -- in
// npx dotenv-cli -e .env.local -- tsx scripts/tst.ts
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
