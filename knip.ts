import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: ["package.json"],
  project: ["package.json"],

  ignore: [
    ".tmp/**",
    ".worktrees/**",
    "**/node_modules/**",
    "**/.next/**",
    "**/.turbo/**",
    "**/dist/**",
    "**/coverage/**",
  ],

  ignoreFiles: [
    ".tmp/**",
    ".worktrees/**",
    "**/node_modules/**",
    "**/.next/**",
    "**/.turbo/**",
    "**/dist/**",
    "**/coverage/**",
  ],

  playwright: false,
  "playwright-ct": false,
  "playwright-test": false,

  rules: {
    files: "warn",
    dependencies: "warn",
    devDependencies: "warn",
    optionalPeerDependencies: "warn",
    unlisted: "warn",
    binaries: "warn",
    unresolved: "warn",
    exports: "warn",
    types: "warn",
    duplicates: "warn",
    enumMembers: "warn",
    namespaceMembers: "warn",
    catalog: "warn",
  },
};

export default config;
