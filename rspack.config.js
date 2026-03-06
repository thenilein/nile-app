const path = require("path");

module.exports = {
    entry: "./src/main.tsx",

    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "bundle.js",
    },

    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },

    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: "builtin:swc-loader",
                options: {
                    jsc: {
                        parser: {
                            syntax: "typescript",
                            tsx: true,
                        },
                        transform: {
                            react: {
                                runtime: "automatic",
                            },
                        },
                    },
                },
            },
        ],
    },

    devServer: {
        port: 3000,
        open: true,
    },

    devtool: "source-map",
};