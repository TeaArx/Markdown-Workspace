import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import { VueLoaderPlugin } from 'vue-loader';

export const plugins = [
  new VueLoaderPlugin(),
  new ForkTsCheckerWebpackPlugin({
    logger: 'webpack-infrastructure',
  }),
];
