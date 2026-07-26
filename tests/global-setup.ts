// tests/global-setup.ts
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInstrumenter } from 'istanbul-lib-instrument';
import type { FileCoverageData } from 'istanbul-lib-coverage';

const sourceDirectories = ['app', 'components', 'hooks', 'lib'];
const clientDirective = /^\s*["']use client["'];?/m;

async function findClientModules(directory: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
        const entryPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            if (entry.name === '__tests__' || entry.name === 'tests') {
                return [];
            }
            return findClientModules(entryPath);
        }

        if (!entry.isFile() || !/\.[jt]sx?$/.test(entry.name) || /\.(test|spec)\.[jt]sx?$/.test(entry.name)) {
            return [];
        }

        const source = await readFile(entryPath, 'utf8');
        return clientDirective.test(source) ? [path.resolve(entryPath)] : [];
    }));

    return files.flat();
}

async function writeClientCoverageBaseline(outputDirectory: string) {
    const clientFiles = (await Promise.all(sourceDirectories.map(findClientModules))).flat();
    const baseline: Record<string, FileCoverageData> = {};

    for (const filename of clientFiles) {
        const instrumenter = createInstrumenter({
            esModules: true,
            parserPlugins: ['typescript', 'jsx'],
        });
        instrumenter.instrumentSync(await readFile(filename, 'utf8'), filename);
        const coverage = instrumenter.lastFileCoverage();
        baseline[coverage.path] = coverage;
    }

    await mkdir(outputDirectory, { recursive: true });
    await writeFile(
        path.join(outputDirectory, 'client-baseline.json'),
        JSON.stringify(baseline),
        'utf8',
    );
}

export default async function globalSetup() {
    if (process.env.PLAYWRIGHT_COLLECT_COVERAGE === 'true') {
        const outputDirectory = path.resolve('.nyc_output/playwright');
        await rm(outputDirectory, { recursive: true, force: true });
        await writeClientCoverageBaseline(outputDirectory);
    }
}
