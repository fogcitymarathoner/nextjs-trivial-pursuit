// tests/fixtures.ts
import { expect, test as base } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createCoverageMap } from 'istanbul-lib-coverage';
import type { CoverageMapData } from 'istanbul-lib-coverage';
import { encodedMap, FlattenMap } from '@jridgewell/trace-mapping';
import type { SectionedSourceMapInput, SourceMapInput } from '@jridgewell/trace-mapping';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import v8ToIstanbul from 'v8-to-istanbul';

type JSCoverage = Awaited<ReturnType<Page['coverage']['stopJSCoverage']>>;

function flattenSourceMap(sourceMap: SectionedSourceMapInput, mapUrl: string): SourceMapInput {
    if (typeof sourceMap === 'object' && sourceMap !== null && 'sections' in sourceMap) {
        return encodedMap(FlattenMap(sourceMap, mapUrl));
    }

    return sourceMap as SourceMapInput;
}

export const test = base.extend<{ collectCoverage: void }>({
    collectCoverage: [async ({ page }, use, testInfo) => {
        // Start coverage collection if COVERAGE is enabled
        if (process.env.COVERAGE === 'true') {
            await page.coverage.startJSCoverage({
                resetOnNavigation: true,
                // Report raw coverage data including anonymous scripts
                reportAnonymousScripts: true,
            });
        }

        // Run the test
        await use();

        // Stop coverage collection and save data
        if (process.env.COVERAGE === 'true') {
            try {
                // Get coverage data from Playwright's built-in API
                const jsCoverage = await page.coverage.stopJSCoverage();

                if (jsCoverage && jsCoverage.length > 0) {
                    // Convert V8 coverage to Istanbul format
                    const istanbulCoverage = await convertV8ToIstanbul(jsCoverage, page);

                    // Save coverage data
                    const outputDirectory = path.resolve('.nyc_output/playwright');
                    const filename = [
                        testInfo.project.name,
                        testInfo.workerIndex,
                        testInfo.testId,
                        testInfo.retry,
                    ].join('-').replace(/[^a-zA-Z0-9_-]/g, '_');

                    await mkdir(outputDirectory, { recursive: true });
                    await writeFile(
                        path.join(outputDirectory, `${filename}.json`),
                        JSON.stringify(istanbulCoverage, null, 2),
                        'utf8',
                    );
                }
            } catch (error) {
                console.warn('Failed to collect coverage:', error);
            }
        }
    }, { auto: true }],
});

/**
 * Convert V8 coverage format to Istanbul/NYC format
 */
async function convertV8ToIstanbul(coverageData: JSCoverage, page: Page): Promise<CoverageMapData> {
    const result = createCoverageMap({});
    const workspacePath = path.resolve('.').replace(/\\/g, '/');

    for (const entry of coverageData) {
        const isTurbopackRuntime = /(?:%5Bturbopack%5D|\[turbopack\]|turbopack-|browser[_-]dev[_-]hmr)/i
            .test(entry.url);

        // Skip node_modules, tests, and other non-source files
        if (isTurbopackRuntime ||
            entry.url.includes('node_modules') ||
            entry.url.includes('test') ||
            entry.url.includes('spec') ||
            entry.url.includes('__tests__')) {
            continue;
        }

        // Clean up the URL to get a file path
        let filePath = entry.url;
        // Remove query parameters
        filePath = filePath.split('?')[0];
        // Remove hash
        filePath = filePath.split('#')[0];
        // Remove protocol and domain for local files
        filePath = filePath.replace(/^https?:\/\/[^/]+/, '');
        // Remove leading slash for relative paths
        filePath = filePath.replace(/^\//, '');

        // Istanbul rejects anonymous V8 entries because they have no file path.
        if (!filePath) {
            continue;
        }

        if (!entry.functions || !entry.source) {
            continue;
        }

        try {
            const sourceMapReference = /\/\/[#@]\s*sourceMappingURL=([^\s]+)/.exec(entry.source)?.[1];
            let converter;

            if (sourceMapReference &&
                !sourceMapReference.startsWith('data:') &&
                /^https?:/.test(entry.url)) {
                const sourceMapResponse = await page.request.get(
                    new URL(sourceMapReference, entry.url).toString(),
                );

                if (sourceMapResponse.ok()) {
                    const sourceMapUrl = new URL(sourceMapReference, entry.url).toString();
                    const rawSourceMap = JSON.parse(
                        await sourceMapResponse.text(),
                    ) as SectionedSourceMapInput;
                    const sourceMap = flattenSourceMap(rawSourceMap, sourceMapUrl);
                    converter = v8ToIstanbul(filePath, 0, {
                        source: entry.source,
                        originalSource: entry.source,
                        sourceMap: { sourcemap: sourceMap },
                    });
                }
            }

            if (!converter) {
                const sourceWithoutExternalMap = entry.source.replace(
                    /\/\/[#@]\s*sourceMappingURL=[^\s]+/g,
                    '',
                );
                converter = v8ToIstanbul(filePath, 0, { source: sourceWithoutExternalMap });
            }

            await converter.load();
            converter.applyCoverage(entry.functions);

            for (const fileCoverage of Object.values(converter.toIstanbul())) {
                const sourcePath = decodeURIComponent(fileCoverage.path).replace(/\\/g, '/');
                const workspaceIndex = sourcePath.toLowerCase().lastIndexOf(
                    workspacePath.toLowerCase(),
                );
                const projectMarker = '[project]/';
                const projectIndex = sourcePath.toLowerCase().lastIndexOf(projectMarker);

                if (workspaceIndex === -1 && projectIndex === -1) {
                    continue;
                }

                const normalizedPath = projectIndex !== -1
                    ? path.join(
                        path.resolve('.'),
                        sourcePath.slice(projectIndex + projectMarker.length),
                    )
                    : path.normalize(sourcePath.slice(workspaceIndex));
                result.addFileCoverage({
                    ...fileCoverage,
                    path: normalizedPath,
                });
            }
        } catch (error) {
            console.warn(`Failed to convert coverage for ${entry.url}:`, error);
        }
    }

    return result.toJSON();
}

export { expect };
