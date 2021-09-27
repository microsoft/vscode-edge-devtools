import copyPlugin from 'copy-webpack-plugin';
import path from 'path';
import { DefinePlugin } from 'webpack';

const commonConfig = {
    devtool: 'source-map',
    mode: 'development',
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

module.exports = (env: any) => {
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
            },
            name: 'extension',
            output: {
                devtoolModuleFilenameTemplate: '../[resource-path]',
                filename: '[name].js',
                libraryTarget: 'commonjs2',
                path: path.resolve(__dirname, 'out'),
            },
            stats: 'errors-only', // Bug ws package includes dev-dependencies which webpack will report as warnings
            target: 'node',
            // Copy startpage html to output bundle
            plugins: [
                new copyPlugin({
                    patterns: [
                    { from: 'startpage', to: 'startpage'},
                    { from: './src/common/styles.css', to: 'common/styles.css'},
                    { from: 'icon.png', to: 'icon.png'},
                    { from: 'src/screencast/view.css', to: 'screencast/view.css'},
                    ],
                }),
                // These must also be defined in the jest section of package.json for tests to pass
                new DefinePlugin({
                    DEBUG: JSON.stringify(env && env.debug || false),
                    DEVTOOLS_BASE_URI: JSON.stringify(env && env.devtoolsBaseUri || undefined),
                })
            ],
        },
    ]
};
