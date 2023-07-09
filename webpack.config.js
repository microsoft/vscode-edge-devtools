// @ts-check
/* eslint-disable @typescript-eslint/no-var-requires */

const copyPlugin = require('copy-webpack-plugin');
const path = require('path');
const { DefinePlugin } = require('webpack');

/** @type {Partial<import('webpack').Configuration>} */
const commonConfig = {
    devtool: 'source-map',
    mode: 'production',
    module: {
        rules: [
            {
                exclude: /node_modules/,
                test: /\.tsx?$/,
                use: 'ts-loader',
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
};

/**
 * @param {Record<string, unknown>} env
 * @returns {import('webpack').Configuration | import('webpack').Configuration[]}
 */
module.exports = env => {
    return [
        {
            ...commonConfig,
            entry: {
                host: './src/host/mainHost.ts',
            },
            name: 'host',
            output: {
                filename: '[name].bundle.js',
                path: path.resolve(__dirname, 'out/host'),
            },
        },
        {
            ...commonConfig,
            entry: {
                screencast: './src/screencast/main.ts',
            },
            name: 'screencast',
            output: {
                filename: '[name].bundle.js',
                path: path.resolve(__dirname, 'out/screencast'),
            },
        },
        {
            ...commonConfig,
            entry: {
                extension: './src/extension.ts',
            },
            externals: {
                vscode: 'commonjs vscode',
                'applicationinsights-native-metrics': 'commonjs applicationinsights-native-metrics', // We're not native
            },
            name: 'extension',
            target: 'node',
            output: {
                devtoolModuleFilenameTemplate: '../[resource-path]',
                filename: '[name].js',
                libraryTarget: 'commonjs2',
                path: path.resolve(__dirname, 'out'),
            },
            // Copy startpage html to output bundle
            plugins: [
                new copyPlugin({
                    patterns: [
                        { from: 'startpage', to: 'startpage' },
                        { from: 'src/common/styles.css', to: 'common/styles.css' },
                        { from: 'icon.png', to: 'icon.png' },
                        { from: 'src/screencast/view.css', to: 'screencast/view.css' },
                    ],
                }),
                // These must also be defined in the jest section of package.json for tests to pass
                new DefinePlugin({
                    DEBUG: JSON.stringify(env.debug ?? false),
                    DEVTOOLS_BASE_URI: JSON.stringify(env.devtoolsBaseUri ?? undefined),
                })
            ],
        },
    ];
};
