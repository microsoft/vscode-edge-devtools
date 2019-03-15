import path from "path";

const commonConfig = {
    devtool: "inline-source-map",
    mode: "development",
    module: {
        rules: [
            {
                exclude: /node_modules/,
                test: /\.tsx?$/,
                use: "ts-loader",
            },
        ],
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
};

module.exports = [
    {
        ...commonConfig,
        entry: {
            host: "./src/host/main.ts",
        },
        name: "host",
        output: {
            filename: "[name].bundle.js",
            path: path.resolve(__dirname, "out/host"),
        },
    },
    {
        ...commonConfig,
        entry: {
            extension: "./src/extension.ts",
        },
        externals: {
            vscode: "commonjs vscode",
        },
        name: "extension",
        output: {
            filename: "[name].js",
            libraryTarget: "commonjs2",
            path: path.resolve(__dirname, "out"),
        },
        stats: "errors-only", // Bug ws package includes dev-dependencies which webpack will report as warnings
        target: "node",
    },
];
