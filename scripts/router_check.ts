// simple script to detect the router im using if i forget
// To run - npx tsx scripts/router_check.ts
// scripts/check-router.ts
import fs from 'fs';
import path from 'path';

function checkRouterType() {
  const projectRoot = process.cwd();

  const hasAppDir = fs.existsSync(path.join(projectRoot, 'app'));
  const hasPagesDir = fs.existsSync(path.join(projectRoot, 'pages'));

  console.log('=== Router Detection ===');
  console.log(`App Router present: ${hasAppDir}`);
  console.log(`Pages Router present: ${hasPagesDir}`);

  if (hasAppDir && hasPagesDir) {
    console.log('✅ Both routers are present (Next.js 13+ hybrid mode)');
    console.log('App Router takes precedence for route conflicts');
  } else if (hasAppDir) {
    console.log('✅ Using App Router only');
  } else if (hasPagesDir) {
    console.log('✅ Using Pages Router only');
  } else {
    console.log('❌ No router found!');
  }

  // Check Next.js version
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8')
    );
    const nextVersion = packageJson.dependencies?.next || packageJson.devDependencies?.next;
    console.log(`\nNext.js version: ${nextVersion}`);

    if (nextVersion && parseInt(nextVersion.match(/\d+/)?.[0] || '0') >= 13) {
      console.log('ℹ️  Next.js 13+ supports App Router');
    }
  } catch (error) {
    console.error('Could not read package.json');
  }
}

// Run the check
checkRouterType();