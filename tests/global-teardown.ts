import { spawnSync } from 'node:child_process';

export default function globalTeardown() {
    if (process.env.COVERAGE !== 'true') {
        return;
    }

    const result = spawnSync(
        process.execPath,
        [
            require.resolve('nyc/bin/nyc.js'),
            'report',
            '--temp-dir=.nyc_output/playwright',
            '--report-dir=coverage/playwright',
        ],
        { stdio: 'inherit' },
    );

    if (result.status !== 0) {
        throw new Error(`NYC coverage report failed with exit code ${result.status}`);
    }
}
