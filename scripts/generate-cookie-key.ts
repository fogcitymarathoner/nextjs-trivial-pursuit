// scripts/generate-cookie-key.ts
import * as crypto from 'crypto';
// npx tsx scripts/generate-cookie-key.ts
const key = crypto.randomBytes(32).toString('hex');
console.log('🔑 Generated COOKIE_SIGNATURE_KEY:');
console.log(key);
console.log('\n📝 Add this to your .env.local:');
console.log(`COOKIE_SIGNATURE_KEY=${key}`);