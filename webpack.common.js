// Use Node.js for require function
const path = require('path');
const webpack = require("webpack");

// This is just a javascript module that exports the config to webpack
module.exports = {/*
    entry: {
        ajax: { import: "/public/js/ajax.js", dependOn: "shared" },
        main: { import: "/public/js/main.js", dependOn: "shared" },
        shared: "firebase/compat/app"
    },*/
    entry: {
        ajax: "./public/js/ajax.js"
    },/*
    optimization: {
        splitChunks: {
            chunks: 'all',
        },
    },*/
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
            }
        ]
    }
};
