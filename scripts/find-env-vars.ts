#!/usr/bin/env ts-node
// scripts/find-env-vars.ts
// To run - npx tsx scripts/find-env-vars.ts

import * as fs from 'fs';
import * as path from 'path';

interface EnvVarUsage {
    file: string;
    line: number;
    column: number;
    variable: string;
    fullMatch: string;
    context: string;
}

interface EnvVarSummary {
    variable: string;
    usageCount: number;
    files: string[];
    lines: number[];
}

// Hardcoded exclude directories
const EXCLUDE_DIRS = [
    'node_modules',
    'coverage',
    'dist',
    '.next',
    'playwright-report',
    'test-results',
    'out',
    'build',
    '.git',
    'tmp',
    '.jest-cache',
];

// File extensions to scan
const EXTENSIONS = ['.ts', '.tsx'];

// Regex patterns for process.env usage
const PATTERNS = [
    /process\.env\.([A-Z_][A-Z0-9_]*)/gi,
    /process\.env\['([A-Z_][A-Z0-9_]*)'\]/gi,
    /process\.env\["([A-Z_][A-Z0-9_]*)"\]/gi,
    /process\.env\[`([A-Z_][A-Z0-9_]*)`\]/gi,
];

class EnvVarScanner {
    private usages: EnvVarUsage[] = [];
    private summary: Map<string, EnvVarSummary> = new Map();
    private totalFilesScanned = 0;
    private totalFilesWithEnvVars = 0;
    private totalEnvVarUsages = 0;
    private errors: string[] = [];

    constructor(private rootDir: string) {}

    /**
     * Check if a directory should be excluded
     */
    private shouldExclude(dir: string): boolean {
        const dirName = path.basename(dir);
        return EXCLUDE_DIRS.some((exclude) => {
            // Exact match or partial match
            return dirName === exclude || dir.includes(`/${exclude}/`) || dir.includes(`\\${exclude}\\`);
        });
    }

    /**
     * Check if a file should be included based on extension
     */
    private shouldInclude(file: string): boolean {
        const ext = path.extname(file);
        return EXTENSIONS.includes(ext);
    }

    /**
     * Get file content with line numbers for context
     */
    private getFileContent(filePath: string): { lines: string[]; content: string } {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');
            return { lines, content };
        } catch (error) {
            this.errors.push(`Error reading file ${filePath}: ${error}`);
            return { lines: [], content: '' };
        }
    }

    /**
     * Extract variable name from match
     */
    private extractVariable(match: string): string {
        const cleanMatch = match.trim();

        // Try to extract from process.env.VAR_NAME
        const dotMatch = cleanMatch.match(/process\.env\.([A-Z_][A-Z0-9_]*)/i);
        if (dotMatch) return dotMatch[1];

        // Try to extract from process.env['VAR_NAME'] or process.env["VAR_NAME"]
        const bracketMatch = cleanMatch.match(/process\.env\[['"`]([A-Z_][A-Z0-9_]*)['"`]\]/i);
        if (bracketMatch) return bracketMatch[1];

        return 'UNKNOWN';
    }

    /**
     * Find all process.env usages in a file
     */
    private findUsagesInFile(filePath: string): EnvVarUsage[] {
        const usages: EnvVarUsage[] = [];
        const { lines, content } = this.getFileContent(filePath);

        if (!content) return usages;

        // Scan each line for patterns
        lines.forEach((line, index) => {
            const lineNumber = index + 1;

            PATTERNS.forEach((pattern) => {
                // Reset regex state
                pattern.lastIndex = 0;
                let match: RegExpExecArray | null;

                while ((match = pattern.exec(line)) !== null) {
                    const fullMatch = match[0];
                    const variable = this.extractVariable(fullMatch);

                    if (variable !== 'UNKNOWN') {
                        // Get context (line with surrounding 2 lines)
                        const startLine = Math.max(0, index - 2);
                        const endLine = Math.min(lines.length - 1, index + 2);
                        const contextLines = lines.slice(startLine, endLine + 1);
                        const context = contextLines.join('\n');

                        usages.push({
                            file: filePath,
                            line: lineNumber,
                            column: match.index + 1,
                            variable,
                            fullMatch,
                            context,
                        });
                    }
                }
            });
        });

        return usages;
    }

    /**
     * Recursively scan directory
     */
    private scanDirectory(dir: string): void {
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                // Skip excluded directories
                if (entry.isDirectory() && this.shouldExclude(fullPath)) {
                    continue;
                }

                if (entry.isDirectory()) {
                    // Recursively scan subdirectory
                    this.scanDirectory(fullPath);
                } else if (entry.isFile() && this.shouldInclude(entry.name)) {
                    this.totalFilesScanned++;
                    const filePath = path.relative(this.rootDir, fullPath);
                    const usages = this.findUsagesInFile(fullPath);

                    if (usages.length > 0) {
                        this.totalFilesWithEnvVars++;
                        this.usages.push(...usages);
                        this.totalEnvVarUsages += usages.length;

                        // Update summary
                        usages.forEach((usage) => {
                            const key = usage.variable;
                            if (!this.summary.has(key)) {
                                this.summary.set(key, {
                                    variable: key,
                                    usageCount: 0,
                                    files: [],
                                    lines: [],
                                });
                            }

                            const summary = this.summary.get(key)!;
                            summary.usageCount++;
                            if (!summary.files.includes(filePath)) {
                                summary.files.push(filePath);
                            }
                            if (!summary.lines.includes(usage.line)) {
                                summary.lines.push(usage.line);
                            }
                        });
                    }
                }
            }
        } catch (error) {
            this.errors.push(`Error scanning directory ${dir}: ${error}`);
        }
    }

    /**
     * Run the scanner
     */
    public scan(): void {
        console.log(`🔍 Scanning for process.env usage in ${this.rootDir}...`);
        console.log(`📁 Excluding directories: ${EXCLUDE_DIRS.join(', ')}`);
        console.log(`📄 Scanning files: ${EXTENSIONS.join(', ')}`);
        console.log('---');

        const startTime = Date.now();
        this.scanDirectory(this.rootDir);
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        this.generateReport(duration);
    }

    /**
     * Generate and output the report
     */
    private generateReport(duration: string): void {
        console.log('\n📊 ========== ENVIRONMENT VARIABLE SCAN REPORT ==========');
        console.log(`⏱️  Scan completed in ${duration} seconds`);
        console.log(`📁 Scanned ${this.totalFilesScanned} files`);
        console.log(`📝 Found ${this.totalFilesWithEnvVars} files with process.env usage`);
        console.log(`🔢 Total process.env usages: ${this.totalEnvVarUsages}`);
        console.log(`📋 Unique environment variables: ${this.summary.size}`);
        console.log(`⚠️  Errors: ${this.errors.length}`);

        if (this.errors.length > 0) {
            console.log('\n❌ Errors encountered:');
            this.errors.forEach((error) => console.log(`  ${error}`));
        }

        console.log('\n📈 ========== VARIABLE USAGE SUMMARY ==========');

        // Sort variables by usage count (descending)
        const sortedVars = Array.from(this.summary.values()).sort(
            (a, b) => b.usageCount - a.usageCount
        );

        // Group variables by type (NEXT_PUBLIC_ vs others)
        const publicVars = sortedVars.filter((v) => v.variable.startsWith('NEXT_PUBLIC_'));
        const privateVars = sortedVars.filter((v) => !v.variable.startsWith('NEXT_PUBLIC_'));

        // Display public variables
        if (publicVars.length > 0) {
            console.log('\n🌐 PUBLIC VARIABLES (NEXT_PUBLIC_*):');
            console.log('   These are accessible in both client and server');
            this.displayVariableList(publicVars);
        }

        // Display private variables
        if (privateVars.length > 0) {
            console.log('\n🔒 PRIVATE/SERVER VARIABLES:');
            console.log('   These should ONLY be used in server-side code');
            this.displayVariableList(privateVars);
        }

        // Display missing variables that might be needed
        console.log('\n💡 ========== RECOMMENDATIONS ==========');

        const envVarsFromSummary = new Set(sortedVars.map((v) => v.variable));
        const commonMissingVars = [
            'NEXT_PUBLIC_FIREBASE_API_KEY',
            'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
            'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
            'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
            'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
            'NEXT_PUBLIC_FIREBASE_APP_ID',
            'NEXT_PUBLIC_FIRESTORE_DATABASE_ID',
            'FIREBASE_CLIENT_EMAIL',
            'FIREBASE_PRIVATE_KEY',
        ];

        const missingCommonVars = commonMissingVars.filter(
            (v) => !envVarsFromSummary.has(v)
        );

        if (missingCommonVars.length > 0) {
            console.log('📋 Common Firebase environment variables not found:');
            missingCommonVars.forEach((v) => console.log(`  - ${v}`));
            console.log('   (These may be needed for your Firebase configuration)');
        }

        // Check for server-only variables in client components
        console.log('\n⚠️  POTENTIAL ISSUES:');
        const serverOnlyVars = sortedVars
            .filter((v) => !v.variable.startsWith('NEXT_PUBLIC_'))
            .filter((v) => {
                // Check if this variable is used in files that might be client-side
                const hasClientUsage = v.files.some((file) =>
                    file.includes('/components/') ||
                    file.includes('/app/') ||
                    file.includes('/pages/')
                );
                return hasClientUsage;
            });

        if (serverOnlyVars.length > 0) {
            console.log('   Server-only variables used in client-side files:');
            serverOnlyVars.forEach((v) => {
                console.log(`   - ${v.variable} (used in ${v.files.length} client files)`);
            });
        } else {
            console.log('   ✅ No server-only variables found in client components');
        }

        console.log('\n📁 ========== DETAILED FILE LIST ==========');
        console.log('Files containing process.env usage:');
        const filesWithEnv = new Set<string>();
        this.usages.forEach((usage) => {
            filesWithEnv.add(usage.file);
        });

        Array.from(filesWithEnv).sort().forEach((file) => {
            const usages = this.usages.filter((u) => u.file === file);
            const vars = [...new Set(usages.map((u) => u.variable))];
            console.log(`  📄 ${file}`);
            console.log(`     Variables: ${vars.join(', ')}`);
            console.log(`     Usages: ${usages.length}`);
        });

        // Generate .env.example file content
        console.log('\n📝 ========== .env.example SUGGESTION ==========');
        console.log('# Environment Variables\n');
        const allVars = sortedVars.map((v) => v.variable);
        allVars.forEach((v) => {
            if (v.startsWith('NEXT_PUBLIC_')) {
                console.log(`NEXT_PUBLIC_${v.replace('NEXT_PUBLIC_', '')}=`);
            } else {
                console.log(`${v}=`);
            }
        });

        // Save report to file
        this.saveReportToFile(sortedVars);
    }

    /**
     * Display a list of variables with usage stats
     */
    private displayVariableList(vars: EnvVarSummary[]): void {
        vars.forEach((v) => {
            console.log(`  - ${v.variable}`);
            console.log(`    Usage: ${v.usageCount} time${v.usageCount > 1 ? 's' : ''}`);
            console.log(`    Files: ${v.files.length}`);
            console.log(`    Lines: ${v.lines.slice(0, 5).join(', ')}${v.lines.length > 5 ? `... (+${v.lines.length - 5} more)` : ''}`);
        });
    }

    /**
     * Save report to file
     */
    private saveReportToFile(sortedVars: EnvVarSummary[]): void {
        const reportDir = path.join(this.rootDir, 'reports');
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        const reportPath = path.join(reportDir, `env-vars-report-${Date.now()}.json`);
        const reportData = {
            timestamp: new Date().toISOString(),
            summary: {
                totalFilesScanned: this.totalFilesScanned,
                totalFilesWithEnvVars: this.totalFilesWithEnvVars,
                totalEnvVarUsages: this.totalEnvVarUsages,
                uniqueVariables: this.summary.size,
                errors: this.errors,
            },
            variables: sortedVars,
            usages: this.usages,
        };

        try {
            fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
            console.log(`\n💾 Report saved to: ${reportPath}`);
        } catch (error) {
            console.error(`Error saving report: ${error}`);
        }

        // Save .env.example file
        const envExamplePath = path.join(this.rootDir, '.env.example');
        let envContent = '# Environment Variables\n# Generated by find-env-vars.ts\n\n';
        sortedVars.forEach((v) => {
            const varName = v.variable;
            envContent += `${varName}=\n`;
        });

        try {
            fs.writeFileSync(envExamplePath, envContent);
            console.log(`📝 .env.example saved to: ${envExamplePath}`);
        } catch (error) {
            console.error(`Error saving .env.example: ${error}`);
        }

        // Save CSV version for easier analysis
        const csvPath = path.join(reportDir, `env-vars-report-${Date.now()}.csv`);
        let csvContent = 'Variable,Usage Count,Files\n';
        sortedVars.forEach((v) => {
            csvContent += `${v.variable},${v.usageCount},${v.files.join(';')}\n`;
        });

        try {
            fs.writeFileSync(csvPath, csvContent);
            console.log(`📊 CSV report saved to: ${csvPath}`);
        } catch (error) {
            console.error(`Error saving CSV report: ${error}`);
        }
    }
}

// ========== Main Execution ==========

function main(): void {
    const rootDir = process.argv[2] || process.cwd();

    if (!fs.existsSync(rootDir)) {
        console.error(`❌ Directory does not exist: ${rootDir}`);
        process.exit(1);
    }

    const scanner = new EnvVarScanner(rootDir);
    scanner.scan();
}

// Run the script
if (require.main === module) {
    main();
}

export { EnvVarScanner, EXCLUDE_DIRS };