Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("prisma/config");
const keys_1 = require("./keys");
require("dotenv/config");
exports.default = (0, config_1.defineConfig)({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: (0, keys_1.keys)().DATABASE_URL,
  },
});
