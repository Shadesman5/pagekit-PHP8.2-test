const _ = require('lodash');
const glob = require('glob');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));
const { VueLoaderPlugin } = require('vue-loader');

// VueLoaderPlugin instance
const vueLoaderPlugin = new VueLoaderPlugin();

const ignore = [
  'packages/**/node_modules/**',
  'packages/**/app/assets/**',
  'packages/**/app/vendor/**'
];

let allExports = [];

// Configuration mode
const args = { p: true, mode: 'production', 'env.production': true };
const mode = _.some(args, (value, arg) => _.get(argv, arg) === value) ? 'production' : 'development';

// Define defaults for webpack configurations
const defaults = {
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: [/node_modules/, /assets/, /vendor/],
        use: ['babel-loader']

      }
    ]
  },
  resolve: {
    alias: {
      '@installer': path.resolve(__dirname, 'app/installer'),
      '@system': path.resolve(__dirname, 'app/system')
    }
  },
  externals: {
    vue: 'Vue',
    uikit: 'UIkit',
    'uikit-util': 'UIkit.util'
  }
};

// Process
glob.sync('{app/modules/**,app/installer/**,app/system/**,packages/**}/webpack.config.js', { ignore }).forEach((file) => {
  const dir = path.dirname(file);
  const filePath = path.join(__dirname, file);
  const configArray = require(filePath);

  if (!Array.isArray(configArray)) {
    throw new Error(`Config in ${filePath} is not an array.`);
  }

  configArray.forEach((config) => {
    if (!config || typeof config !== 'object') {
      throw new Error(`Invalid configuration in ${filePath}.`);
    }

    allExports.push(make(dir, config, vueLoaderPlugin)); // Pass the VueLoaderPlugin instance to the make function
  });
});

// Make each webpack.config.js
function make(dir, config, vueLoaderPlugin) {
  const plugins = _.get(config, 'plugins') || [];
  const rules = _.get(config, 'module.rules') || [];
  const isPluginExist = (plugin) => !!plugins.some((plg) => plg.constructor.name === plugin.constructor.name);
  const isLoaderExist = (loader) => rules.some((e) => e.use === loader || e.use.includes(loader));

  // Merge with defaults
  config = _.merge({
    mode,
    context: path.resolve(__dirname, dir), // Ensure absolute path for context
    output: { path: path.resolve(__dirname, dir) }, // Ensure absolute path for output
    resolve: defaults.resolve,
    externals: defaults.externals
  }, config);

  // Default rules to first
  _.set(config, 'module.rules', _.concat([], defaults.module.rules, rules));

  // Push VueLoaderPlugin if needed and doesn't exist.
  if (isLoaderExist('vue-loader') && !isPluginExist(vueLoaderPlugin)) { // Check the provided VueLoaderPlugin instance
    plugins.push(vueLoaderPlugin); // Push the provided VueLoaderPlugin instance
    config.plugins = plugins;
  }

  return config;
}

module.exports = allExports;
