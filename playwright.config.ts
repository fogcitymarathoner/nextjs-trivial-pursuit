// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import type { ReporterDescription } from '@playwright/test';
import { argv, env } from 'node:process';

const isCI = !!env.CI;
const isDebug = env.PWDEBUG === '1' || argv.includes('--debug');
const isCoverage = env.COVERAGE === 'true' || env.COLLECT_COVERAGE === 'true';
const isFocusedTestRun = process.argv.some((arg) =>
    /(__tests__|\.test\.|\.spec\.)/.test(arg)
);
const isWatchMode = process.argv.includes('--watch') || process.argv.includes('--watchAll');
const shouldCollectCoverage = isCoverage && !isWatchMode;
env.PLAYWRIGHT_COLLECT_COVERAGE = String(shouldCollectCoverage);
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';
const isWindowsNode22 = process.platform === 'win32' && process.versions.node.startsWith('22.');

const port = Number(env.PLAYWRIGHT_PORT ?? 3000);
const host = env.PLAYWRIGHT_HOST ?? '127.0.0.1';
const baseURL = `http://${host}:${port}`;
const webServerCommand = isCI
    ? 'yarn build && node scripts/copy-standalone-assets.mjs && node scripts/start-playwright-standalone.mjs'
    : `node node_modules/next/dist/bin/next dev -H ${host} -p ${port}`;

const browserProjects = [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
  {
    name: 'firefox',
    use: { ...devices['Desktop Firefox'] },
  },
  {
    name: 'webkit',
    use: { ...devices['Desktop Safari'] },
  },
];
const supportedBrowserProjects = isWindowsNode22
    ? browserProjects.filter((project) => project.name !== 'firefox')
    : browserProjects;

/**
 * Get test match patterns
 */
const getTestMatch = () => {
  const patterns = [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
  ];

  if (!runIntegrationTests) {
    // Exclude integration tests by default
    patterns.push('!**/*.integration.test.ts');
    patterns.push('!**/*.integration.test.tsx');
    patterns.push('!**/integration/**/*.test.ts');
    patterns.push('!**/integration/**/*.test.tsx');
    patterns.push('!**/__tests__/integration/**');
  }

  return patterns;
};

/**
 * Get test ignore patterns
 */
const getTestIgnore = () => {
  const patterns = [
    '**/build/**/*.test.ts',
    '**/example.spec.ts',
    '**/*.test.ts',
    '**/playwright/**/*.ts',
    '**/test-results/**',
    '**/node_modules/**',
    '**/.next/**',
    '**/out/**',
    '**/dist/**',
    '**/coverage/**',
    '**/.jest-cache/**',
    '**/__tests__/helpers/**',
    '**/tests/helpers/**',
    '**/test-helpers/**',
    '**/__mocks__/**',
    '**/mocks/**',
  ];

  if (!runIntegrationTests) {
    patterns.push('**/*.integration.test.ts');
    patterns.push('**/*.integration.test.tsx');
    patterns.push('**/integration/**');
  }

  return patterns;
};

/**
 * Coverage thresholds configuration
 * These are set to current coverage levels and will be increased as coverage improves
 */
// use threshold in nyc.config.js
const coverageThresholds = {
  statements: 90,
  branches: 68,
  functions: 90,
  lines: 97,
};

/**
 * Coverage configuration
 */
const coverageConfig = shouldCollectCoverage ? {
  coverage: {
    enabled: true,
    reports: ['lcov', 'html', 'text-summary', 'json', 'json-summary', 'clover'],
    reportDir: 'coverage/playwright', // Use coverage/playwright
    exclude: [
      // Node modules
      '**/node_modules/**',

      // Test files
      '**/tests/**',
      '**/__tests__/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.integration.test.ts',
      '**/*.integration.test.tsx',

      // Build outputs
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      '**/coverage/**',

      // Test helpers
      '**/__tests__/helpers/**',
      '**/tests/helpers/**',
      '**/test-helpers/**',
      '**/test-utils/**',
      '**/__mocks__/**',
      '**/mocks/**',

      // Configuration files
      '**/*.config.js',
      '**/*.config.ts',
      '**/jest.setup.*',
      '**/jest.config.*',
      '**/playwright.config.*',

      // Types
      '**/types/**',
      '**/*.d.ts',
      '**/*Types.ts',
      '**/*.interface.ts',

      // Generated files
      '**/.nyc_output/**',
      '**/playwright-report/**',
      '**/test-results/**',

      // Scripts
      '**/scripts/**',

      // Firebase data-access modules are exercised by the Jest service suites.
      // Browser coverage only observes the small subset reached through UI flows.
      '**/lib/firestore/productService.ts',
      '**/lib/firestore/triviaService.ts',

      // Stories
      '**/*.stories.tsx',
      '**/*.stories.ts',
    ],
    // Collect coverage from these directories (matching Jest config)
    include: [
      'app/**/*.{ts,tsx}',
      'lib/**/*.{ts,tsx}',
      'components/**/*.{ts,tsx}',
      'utils/**/*.{ts,tsx}',
      'hooks/**/*.{ts,tsx}',
      'services/**/*.{ts,tsx}',
      'store/**/*.{ts,tsx}',
      'pages/**/*.{ts,tsx}',
    ],
    sourceRoot: process.cwd(),
  },
} : {};

const reporters: ReporterDescription[] = [
  ['list'],
  ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ['json', { outputFile: 'coverage/playwright-coverage.json' }],
];

if (isCI) {
  reporters.push(['junit', { outputFile: 'test-results/playwright/junit.xml' }]);
}

if (shouldCollectCoverage) {
  reporters.push(['monocart-reporter', {
    name: 'Playwright Test Report',
    outputFile: 'playwright-report/monocart.html',
    // Coverage configuration with thresholds
    coverage: {
      // Use the same coverage configuration as above
      enabled: true,
      reports: ['lcov', 'html', 'text-summary', 'json', 'json-summary', 'clover'],
      reportDir: 'coverage/playwright',
      exclude: [
        '**/node_modules/**',
        '**/tests/**',
        '**/__tests__/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/*.integration.test.ts',
        '**/*.integration.test.tsx',
        '**/.next/**',
        '**/dist/**',
        '**/build/**',
        '**/out/**',
        '**/coverage/**',
        '**/__tests__/helpers/**',
        '**/tests/helpers/**',
        '**/test-helpers/**',
        '**/test-utils/**',
        '**/__mocks__/**',
        '**/mocks/**',
        '**/*.config.js',
        '**/*.config.ts',
        '**/jest.setup.*',
        '**/jest.config.*',
        '**/playwright.config.*',
        '**/types/**',
        '**/*.d.ts',
        '**/*Types.ts',
        '**/*.interface.ts',
        '**/.nyc_output/**',
        '**/playwright-report/**',
        '**/test-results/**',
        '**/scripts/**',
        '**/lib/firestore/productService.ts',
        '**/lib/firestore/triviaService.ts',
        '**/*.stories.tsx',
        '**/*.stories.ts',
      ],
      include: [
        'app/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        'utils/**/*.{ts,tsx}',
        'hooks/**/*.{ts,tsx}',
        'services/**/*.{ts,tsx}',
        'store/**/*.{ts,tsx}',
        'pages/**/*.{ts,tsx}',
      ],
      sourceRoot: process.cwd(),
      // Coverage thresholds - fails the build if not met
      thresholds: coverageThresholds,
    },
  }]);
}

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  testMatch: getTestMatch(),
  testIgnore: getTestIgnore(),

  /* Keep tests within a file sequential; independent files still run in parallel. */
  fullyParallel: false,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: isCI,

  /* Retry on CI only */
  retries: isCI ? 2 : 0,

  /* Opt out of parallel tests on CI. */
  // A single Next.js dev server cannot reliably compile and hydrate routes when
  // Playwright defaults to one worker per available CPU core. Keep local runs
  // parallel, but cap the pressure on Turbopack and the browser processes.
  workers: isCI || isCoverage ? 1 : 4,

  /* Timeout for each test */
  timeout: isCoverage ? 60000 : 30000,

  /* Expect timeout */
  expect: {
    timeout: 5000,
  },

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: isDebug ? 'list' : reporters,

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video recording on failure */
    video: 'retain-on-failure',

    /* Coverage configuration */
    ...coverageConfig,
  },

  /* Configure projects for major browsers */
  projects: [
    ...(isDebug || isCoverage ? [browserProjects[0]] : supportedBrowserProjects),
    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: webServerCommand,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120 * 1000,
    // Wait for the server to be ready
    stdout: 'pipe',
    stderr: 'pipe',
  },

  /* Global setup and teardown */
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',

  /* Maximum number of test failures before stopping */
  maxFailures: isCI ? 10 : undefined,

  /* Verbose output */
  // verbose: isCI ? false : true,
});

// Log configuration in verbose mode
if (process.env.DEBUG_PLAYWRIGHT === 'true') {
  console.log('=======================================');
  console.log('🔧 Playwright Configuration Details:');
  console.log('=======================================');
  console.log('📁 Test Dir:', './tests');
  console.log('📁 Test Match:', getTestMatch());
  console.log('🚫 Test Ignore:', getTestIgnore());
  console.log('📊 Collect Coverage:', isCoverage && !isFocusedTestRun && !isWatchMode);
  console.log('📁 Coverage Directory:', 'coverage/playwright');
  console.log('🔄 Run Integration Tests:', runIntegrationTests);
  console.log('💻 CI Mode:', isCI);
  console.log('🎯 Focused Test Run:', isFocusedTestRun);
  console.log('👀 Watch Mode:', isWatchMode);
  console.log('⏱️ Test Timeout:', isCI ? 30000 : 10000);
  console.log('⚙️ Workers:', isCI ? 1 : 'Parallel');
  console.log('✅ Monocart Reporter Enabled:', isCoverage && !isFocusedTestRun && !isWatchMode);
  console.log(`📊 Coverage Thresholds: statements=${coverageThresholds.statements}%, branches=${coverageThresholds.branches}%, functions=${coverageThresholds.functions}%, lines=${coverageThresholds.lines}%`);
  console.log('=======================================');
  console.log('💡 Tip: To improve coverage, add more tests for untested code paths.');
  console.log('🎯 Target thresholds: statements=80%, branches=70%, functions=80%, lines=80%');
  console.log('=======================================');
}
