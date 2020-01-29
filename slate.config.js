/* eslint-disable */

// Configuration file for all things Slate.
// For more information, visit https://github.com/Shopify/slate/wiki/Slate-Configuration

const webpack = require('webpack');
const path = require('path');
const ImageminPlugin = require('imagemin-webpack-plugin').default;
const imageminMozjpeg = require('imagemin-mozjpeg');

module.exports = {
  'cssVarLoader.liquidPath': ['src/snippets/css-variables.liquid'],
  'webpack.extend': {
    resolve: {
      alias: {
        vue$: path.resolve('./node_modules/vue/dist/vue.esm.js'),
        jquery: path.resolve('./node_modules/jquery'),
      },
    },
    module: {
      rules: [{
          test: /\.js$/,
          use: 'imports-loader?$=jquery,jQuery=jquery',
        }],
    },
    plugins: [
      new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
      // Make sure that the plugin is after any plugins that add images
      new ImageminPlugin({
        disable: process.env.NODE_ENV !== 'production', // Disable during development
        test: /\.(jpe?g|png|gif|svg)$/i,
        // optipng: {
        //   optimizationLevel: 7,
        // },
        pngquant: {
          quality: '75-85',
          speed: 4,
        },
        gifsicle: {
          optimizationLevel: 3,
        },
        svgo: {
          plugins: [{
            removeViewBox: false,
            removeEmptyAttrs: true,
          }],
        },
        jpegtran: {
          progressive: true,
        },
        plugins: [
          imageminMozjpeg({
            quality: 80,
            progressive: true,
          }),
        ],
      }),
    ],
  },
};