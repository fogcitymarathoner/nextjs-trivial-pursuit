// babel.config.js
module.exports = function babelConfig(api) {
    const collectCoverage = process.env.COVERAGE === 'true';

    api.cache.using(() => collectCoverage);

    return {
        presets: ['next/babel'],
        plugins: [],
        overrides: collectCoverage
            ? [{
                test: /\.[jt]sx?$/,
                exclude: [
                    /(^|[\\/])proxy\.ts$/,
                    /(^|[\\/])layout\.[jt]sx?$/,
                    /(^|[\\/])[^\\/]+\.config\.[jt]s$/,
                    /[\\/](tests|__tests__)[\\/]/,
                ],
                plugins: ['istanbul'],
            }]
            : [],
    };
};
