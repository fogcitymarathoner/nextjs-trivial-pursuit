// scripts/test_urls.ts

// To run - npx tsx scripts/test_non_wikipedia_urls.ts --env-file .env.local [options]
// Examples:
//   npx tsx scripts/test_non_wikipedia_urls.ts                              # Test all URLs
//   npx tsx scripts/test_non_wikipedia_urls.ts --timeout 5000               # Set timeout to 5 seconds
//   npx tsx scripts/test_non_wikipedia_urls.ts --output results.json        # Save results to JSON file
//   npx tsx scripts/test_non_wikipedia_urls.ts --concurrent 5               # Test 5 URLs at a time
//   npx tsx scripts/test_non_wikipedia_urls.ts --help                       # Show help

import fs from 'fs';
import path from 'path';

interface TestConfig {
  timeout: number;
  outputFile?: string;
  concurrent: number;
  showHelp: boolean;
  verbose: boolean;
}

interface UrlTestResult {
  url: string;
  status: number | null;
  statusText: string;
  ok: boolean;
  responseTime: number;
  contentType: string | null;
  contentLength: number | null;
  error?: string;
  timestamp: string;
}

const DEFAULT_TIMEOUT = 10000; // 10 seconds
const DEFAULT_CONCURRENT = 10;

function showHelp(): void {
  console.log(`
📚 Test URLs Script - Help Guide
${"=".repeat(60)}

USAGE:
  npx tsx scripts/test_non_wikipedia_urls.ts [options]

OPTIONS:
  -t, --timeout <ms>          Request timeout in milliseconds (default: ${DEFAULT_TIMEOUT})
  
  -c, --concurrent <number>   Number of concurrent requests (default: ${DEFAULT_CONCURRENT})
  
  -o, --output <filename>     Save results to a JSON file (e.g., --output url-results.json)
  
  -v, --verbose               Show detailed output for each URL
  
  -h, --help                  Show this help message

EXAMPLES:
  # Test all URLs with default settings
  npx tsx scripts/test_non_wikipedia_urls.ts

  # Test with 5 second timeout
  npx tsx scripts/test_non_wikipedia_urls.ts --timeout 5000

  # Save results to file
  npx tsx scripts/test_non_wikipedia_urls.ts --output results.json

  # Test with 5 concurrent requests
  npx tsx scripts/test_non_wikipedia_urls.ts --concurrent 5

  # Verbose output
  npx tsx scripts/test_non_wikipedia_urls.ts --verbose

${"=".repeat(60)}
  `);
}

function parseArguments(): TestConfig {
  const args = process.argv.slice(2);
  const config: TestConfig = {
    timeout: DEFAULT_TIMEOUT,
    concurrent: DEFAULT_CONCURRENT,
    showHelp: false,
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-h' || arg === '--help') {
      config.showHelp = true;
      return config;
    }

    if (arg === '-v' || arg === '--verbose') {
      config.verbose = true;
      continue;
    }

    if (arg === '-t' || arg === '--timeout') {
      const value = parseInt(args[i + 1], 10);
      if (isNaN(value) || value <= 0) {
        console.error(`❌ Error: Timeout must be a positive number`);
        process.exit(1);
      }
      config.timeout = value;
      i++;
      continue;
    }

    if (arg === '-c' || arg === '--concurrent') {
      const value = parseInt(args[i + 1], 10);
      if (isNaN(value) || value <= 0) {
        console.error(`❌ Error: Concurrent must be a positive number`);
        process.exit(1);
      }
      config.concurrent = value;
      i++;
      continue;
    }

    if (arg === '-o' || arg === '--output') {
      config.outputFile = args[i + 1];
      i++;
      continue;
    }
  }

  return config;
}

async function testUrl(
  url: string,
  timeout: number
): Promise<UrlTestResult> {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; URL-Tester/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    clearTimeout(timeoutId);

    const responseTime = Date.now() - startTime;
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');

    return {
      url,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      responseTime,
      contentType: contentType ? contentType.split(';')[0].trim() : null,
      contentLength: contentLength ? parseInt(contentLength, 10) : null,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    let errorMessage: string;
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = `Timeout after ${timeout}ms`;
      } else {
        errorMessage = error.message;
      }
    } else {
      errorMessage = String(error);
    }

    return {
      url,
      status: null,
      statusText: 'ERROR',
      ok: false,
      responseTime,
      contentType: null,
      contentLength: null,
      error: errorMessage,
      timestamp: new Date().toISOString()
    };
  }
}

async function testUrls(
  urls: string[],
  config: TestConfig
): Promise<UrlTestResult[]> {
  const results: UrlTestResult[] = [];
  let completed = 0;
  const total = urls.length;

  console.log(`\n📋 Testing ${total} URLs with ${config.concurrent} concurrent requests...\n`);

  // Process in batches
  for (let i = 0; i < urls.length; i += config.concurrent) {
    const batch = urls.slice(i, i + config.concurrent);
    const batchPromises = batch.map(url => testUrl(url, config.timeout));

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Update progress
    completed += batch.length;
    const successCount = batchResults.filter(r => r.ok).length;
    const failCount = batchResults.filter(r => !r.ok).length;

    console.log(`📊 Progress: ${completed}/${total} (✅ ${successCount} | ❌ ${failCount})`);

    // Display results if verbose
    if (config.verbose) {
      batchResults.forEach(result => {
        const icon = result.ok ? '✅' : '❌';
        const status = result.status || 'ERR';
        const time = `${result.responseTime}ms`;
        console.log(`  ${icon} ${status} - ${time} - ${result.url}`);
        if (result.error) {
          console.log(`     ⚠️  Error: ${result.error}`);
        }
      });
      console.log('');
    }
  }

  return results;
}

function generateSummary(results: UrlTestResult[]): void {
  const total = results.length;
  const successful = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  const errors = results.filter(r => r.error).length;

  const avgResponseTime = results
    .filter(r => r.ok)
    .reduce((sum, r) => sum + r.responseTime, 0) / (successful || 1);

  const statusCodes: Record<number, number> = {};
  results.forEach(r => {
    if (r.status) {
      statusCodes[r.status] = (statusCodes[r.status] || 0) + 1;
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('📊 URL TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`📝 Total URLs: ${total}`);
  console.log(`✅ Successful: ${successful} (${((successful/total)*100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${failed} (${((failed/total)*100).toFixed(1)}%)`);
  if (errors > 0) {
    console.log(`⚠️  Errors: ${errors}`);
  }
  console.log(`⏱️  Average response time: ${avgResponseTime.toFixed(0)}ms`);
  console.log(`\n📊 Status Code Distribution:`);
  Object.entries(statusCodes)
    .sort((a, b) => b[1] - a[1])
    .forEach(([code, count]) => {
      const percentage = ((count/total)*100).toFixed(1);
      console.log(`   ${code}: ${count} (${percentage}%)`);
    });

  // Show failed URLs
  const failedUrls = results.filter(r => !r.ok);
  if (failedUrls.length > 0) {
    console.log(`\n❌ Failed URLs (${failedUrls.length}):`);
    failedUrls.forEach(r => {
      console.log(`   ${r.url}`);
      console.log(`      Status: ${r.status || 'ERROR'} - ${r.statusText}`);
      if (r.error) {
        console.log(`      Error: ${r.error}`);
      }
      console.log(`      Response time: ${r.responseTime}ms`);
    });
  }
}

async function saveResults(
  results: UrlTestResult[],
  outputFile: string
): Promise<void> {
  const outputPath = path.resolve(process.cwd(), outputFile);

  const data = {
    generatedAt: new Date().toISOString(),
    totalUrls: results.length,
    successful: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    results
  };

  try {
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`\n💾 Results saved to: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Error saving results: ${error}`);
  }
}

// Main execution
(async () => {
  try {
    const config = parseArguments();

    if (config.showHelp) {
      showHelp();
      process.exit(0);
    }

    console.log(`\n🚀 Starting URL Test Script`);
    console.log(`📅 ${new Date().toLocaleString()}`);
    console.log(`⏱️  Timeout: ${config.timeout}ms`);
    console.log(`🔄 Concurrent requests: ${config.concurrent}`);

    // Read URLs from JSON file
    const jsonPath = path.resolve(process.cwd(), 'data/presidents_non_wikipedia_url.json');

    if (!fs.existsSync(jsonPath)) {
      console.error(`❌ Error: File not found at ${jsonPath}`);
      console.log(`💡 Please ensure data/presidents_non_wikipedia_url.json exists`);
      process.exit(1);
    }

    const fileContent = fs.readFileSync(jsonPath, 'utf-8');
    const urls: string[] = JSON.parse(fileContent);

    if (!Array.isArray(urls) || urls.length === 0) {
      console.error(`❌ Error: Invalid JSON file - expected an array of URLs`);
      process.exit(1);
    }

    console.log(`📋 Found ${urls.length} URLs to test\n`);

    // Test URLs
    const results = await testUrls(urls, config);

    // Generate summary
    generateSummary(results);

    // Save results if output file is specified
    if (config.outputFile) {
      await saveResults(results, config.outputFile);
    }

    // Exit with appropriate code
    const failedCount = results.filter(r => !r.ok).length;
    if (failedCount > 0) {
      console.log(`\n⚠️  ${failedCount} URLs failed. Check the summary above.`);
      process.exit(1);
    } else {
      console.log('\n✨ All URLs tested successfully!');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
})();