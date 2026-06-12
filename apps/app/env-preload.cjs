"use strict";
// Preload root .env.local before Next.js config validates env vars.
// Loaded via: NODE_OPTIONS="-r ./env-preload.cjs"
const { config } = require("dotenv");
const path = require("node:path");

// Resolve root .env.local relative to this file's location (apps/app/env-preload.cjs → ../../.env.local)
const rootEnvPath = path.resolve(__dirname, "../../.env.local");
config({ path: rootEnvPath, override: true });
