const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    mode: 'production',
    entry: {
        main: './public/main.jsx',
        abidos: './public/abidoscalculator/calculator.jsx',
        dispatch: './public/dispatch/calculator.jsx',
        auction: './public/auction/calculator.jsx'
    },
    output: {
        path: path.resolve(__dirname, 'docs'),
        filename: '[name]/bundle.[contenthash].js',
        clean: true
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-react']
                    }
                }
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './public/index.html',
            filename: 'index.html',
            chunks: ['main']
        }),
        new HtmlWebpackPlugin({
            template: './public/abidoscalculator/index.html',
            filename: 'abidoscalculator/index.html',
            chunks: ['abidos']
        }),
        new HtmlWebpackPlugin({
            template: './public/dispatch/index.html',
            filename: 'dispatch/index.html',
            chunks: ['dispatch']
        }),
        new HtmlWebpackPlugin({
            template: './public/auction/index.html',
            filename: 'auction/index.html',
            chunks: ['auction']
        })
    ],
    resolve: {
        extensions: ['.js', '.jsx']
    }
};
