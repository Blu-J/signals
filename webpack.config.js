var path = require("path");
var webpack = require("webpack");
module.exports = {
  // devtool: "eval-source-map",
  entry: {
    signals: "./src/signal.js",
  },
  output: {
    path: path.resolve(__dirname) + '/dist',
    filename: "[name].js",
    chunkFilename: "[id].js",
    library: 'signals',
    libraryTarget: 'umd'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel',
        query: {
          presets: ['es2015'],
          plugins: ['transform-object-rest-spread','transform-es2015-modules-umd']

        }
      }
    ]
  },
  resolve: {
    extensions: ["", ".webpack.js", ".web.js", ".js", ".es6.js", ".es6"]
  },
};
