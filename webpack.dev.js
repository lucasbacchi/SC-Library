// Use Node.js for require function
const path = require('path');

// Webpack Merge for combining the common file
const { merge } = require('webpack-merge');
const common = require("./webpack.common");

// This is just a javascript module that exports the config to webpack
module.exports = merge(common, {
    mode: "development",
    devServer: {
        static: {
          directory: path.join(__dirname, 'public'),
        },
        compress: true,
        port: 8080,
      },
    optimization: {
        runtimeChunk: "single",
        minimize: false
    },
    devtool: "source-map"
});