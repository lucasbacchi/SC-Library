// Use Node.js for require function
const path = require('path');

// Webpack Merge for combining the common file
const { merge } = require('webpack-merge');
const common = require("./webpack.common");

// This is just a javascript module that exports the config to webpack
// @ts-ignore
module.exports = merge(common, {
    mode: "production"
});