const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: "development",
  target: 'web',
  entry: path.join(__dirname, "src", "index.js"),
  output: {
    path:path.resolve(__dirname, "dist"),
  },

  module: {
    rules: [
      {
        test: /\.?js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
      
      {
        test: /\.(png|jp(e*)g|svg|gif)$/,
        use: ['file-loader'],
      },

      {
        test: /\.svg$/,
        use: ['@svgr/webpack'],
      },
    ]
  },

//   externals: {
//     'react': 'React'
// },

devServer: {
  host: '0.0.0.0',
  port: 3000,
  hot: true,
  // overlay: true,
  historyApiFallback: false,
  // watchContentBase: true,
  // disableHostCheck: true,
  headers: {
    'Access-Control-Allow-Origin': "*",
    'Cross-Origin-Embedder-Policy' : 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin'
  },
  open: {
    target: ['http://127.0.0.1:3000'],
    app: {
      name: 'chrome'
    },
  },
  // open: 'http://127.0.0.1:3001',
  // openPage: https ? 'https://127.0.0.1:3001' : 'http://127.0.0.1:3001'
},
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "public", "index.html"),
    }),
  ],
}