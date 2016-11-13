module.exports = {
  entry: "./src/index.ts",
  output: {
    filename: "./dist/bundle.js",
    library: 'rxjreconnection'
  },
  resolve: {
    extensions: ['', '.webpack.js', '.web.js', '.ts', '.js']
  },
  module: {
    loaders: [
      // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
      { test: /\.tsx?$/, loader: 'ts-loader' }
    ]
  }
}
