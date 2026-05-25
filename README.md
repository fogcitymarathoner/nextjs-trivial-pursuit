# Trivial Pursuit
Current a Q and A interview. Ask questions an get answers.

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