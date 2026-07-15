# Trivial Pursuit
Current a Q and A interview. Ask questions an get answers.

# App Router
## Stack
* "next": "16.2.6"
* Tailwind
# Environment Variables
* .env - production
* .env.local - development
User **config/env.ts** to import and check existence of necessary variables
```
import {DEBUG, PINECONE_API_KEY} from "@/src/config/env";
```
# Using NVM with native node intact
Prepend **C:\Users\marc\AppData\Roaming\nvm\v20.19.0** to system path.
```
$env:Path = "C:\Users\marc\AppData\Roaming\nvm\v20.19.0;" + $env:Path
```
# Running Scripts
```angular2html
npx tsx scripts/my-script.ts
# or with .env files
npx dotenv -e .env.local -- tsx scripts/my-script.ts
```
# Local Production Testing
## Test the Docker build locally
npm run build
node .next/standalone/server.js

## Or test with Docker
docker build -t my-app .
docker run -p 3000:3000 my-app

# Summary of PowerShell + Yarn commands:
| Alias | Command | Description |
|:------|:--------|:------------|
| `pt` | `yarn playwright test` | Run all tests headless |
| `ptu` | `yarn playwright test --ui` | Run with interactive UI |
| `pth` | `yarn playwright test --headed` | Run with visible browser |
| (custom) | `yarn playwright test --debug` | Run in debug mode |
| (custom) | `yarn playwright test navigation.spec.ts` | Run specific file |
| (custom) | `yarn playwright test --project=chromium` | Run specific browser |
| (custom) | `yarn playwright show-report` | View test report |
| (custom) | `yarn playwright codegen` | Record a test by interacting |
| (custom) | `yarn create playwright` | Install Playwright |


# Codex usage limit problemd
https://platform.openai.com/settings/organization/billing/overview