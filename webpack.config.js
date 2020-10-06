const path = require('path');
const CircularDependencyPlugin = require('circular-dependency-plugin')


module.exports = {
  entry: {
    'index': './src/index.ts',
    'renderer/index': './src/renderer/index.ts',
  },
  plugins: [
     new CircularDependencyPlugin({
         failOnError: true,
         cwd: process.cwd(),
     })
  ],
  target: 'electron-renderer',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
  },
  output: {
    libraryTarget: 'umd',
    globalObject: 'this',
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  }
};
