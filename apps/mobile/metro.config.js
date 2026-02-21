const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.blockList = [
  /.*[\\/]apps[\\/]api[\\/]\.next($|[\\/].*)/,
  /.*[\\/]apps[\\/]api[\\/]\.next-dev($|[\\/].*)/,
  /.*[\\/]apps[\\/]app[\\/]\.next($|[\\/].*)/,
  /.*[\\/]apps[\\/]app[\\/]\.next-dev($|[\\/].*)/,
  /.*[\\/]node_modules[\\/]\.cache($|[\\/].*)/,
];

module.exports = config;
