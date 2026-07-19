// scripts/playwright-coverage-reporter.js
const fs = require('fs');
const path = require('path');

class PlaywrightCoverageReporter {
    constructor(globalConfig, options) {
        this.options = options || {};
        this.outputDir = options.outputDir || 'coverage/playwright';
    }

    onRunComplete(contexts, results) {
        const coverageData = results.testResults.map(result => ({
            testFile: result.testFilePath,
            tests: result.testResults.map(test => ({
                name: test.title,
                status: test.status,
                duration: test.duration,
                failureMessages: test.failureMessages
            }))
        }));

        // Generate separate coverage report
        const report = {
            timestamp: new Date().toISOString(),
            total: results.numTotalTests,
            passed: results.numPassedTests,
            failed: results.numFailedTests,
            coverage: coverageData
        };

        const outputPath = path.join(this.outputDir, 'coverage-report.json');
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
        fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    }
}

module.exports = PlaywrightCoverageReporter;
