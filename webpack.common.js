// Use Node.js for require function
const path = require('path');
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

// This is just a javascript module that exports the config to webpack
module.exports = {
    entry: {
        ajax: "./public/js/ajax.js"
    },
    output: {
        filename: "[name].bundle.js",
        path: path.resolve(__dirname, "./public/dist"),
        clean: true
    },
    target: "web",
    plugins: [
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery"
        }),
        new MiniCssExtractPlugin({
            filename: "[name].css",
        })
    ],
    module: {
        rules: [
            {
                test: require.resolve("jquery"),
                loader: "expose-loader",
                options: {
                    exposes: ["$", "jQuery"],
                }
            },
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, "css-loader"]
            }
        ]
    },
    resolve: {
        modules: ['node_modules', path.resolve(__dirname, "./public/css")],
    }
};
