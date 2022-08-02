// Use Node.js for require function
const path = require('path');

// This is just a javascript module that exports the config to webpack
module.exports = {
    /*entry: {
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
        path: path.resolve(__dirname, "./public")/*,
        We should try to use this feature, but as it stands, that would delete the whole project
        clean: true*/
    },
    target: "web"
};