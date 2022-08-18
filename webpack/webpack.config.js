const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const DotenvWebpackPlugin = require("dotenv-webpack");
const webpack = require("webpack");
module.exports = {
  mode: "production",
  entry: {
    background: path.resolve(__dirname, "..", "src", "background.ts"),
  },
  output: {
    path: path.join(__dirname, "../dist"),
    filename: "[name].js",
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: ".", to: ".", context: "public" }],
    }),
    new DotenvWebpackPlugin(),
    new webpack.ProvidePlugin({
      process: "process/browser",
    }),
  ],
};
