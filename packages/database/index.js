var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? (o, m, k, k2) => {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get() {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : (o, m, k, k2) => {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __exportStar =
  (this && this.__exportStar) ||
  ((m, exports) => {
    for (var p in m)
      if (p !== "default" && !Object.hasOwn(exports, p))
        __createBinding(exports, m, p);
  });
var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.Prisma = exports.tenantDatabase = exports.database = void 0;
require("server-only");
const serverless_1 = require("@neondatabase/serverless");
const adapter_neon_1 = require("@prisma/adapter-neon");
const ws_1 = __importDefault(require("ws"));
const client_1 = require("./generated/client");
const keys_1 = require("./keys");
const tenant_1 = require("./tenant");
const globalForPrisma = global;
serverless_1.neonConfig.webSocketConstructor = ws_1.default;
const adapter = new adapter_neon_1.PrismaNeon({
  connectionString: (0, keys_1.keys)().DATABASE_URL,
});
exports.database =
  globalForPrisma.prisma || new client_1.PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = exports.database;
}
const tenantDatabase = (tenantId) =>
  (0, tenant_1.createTenantClient)(tenantId, exports.database);
exports.tenantDatabase = tenantDatabase;
__exportStar(require("./generated/client"), exports);
// biome-ignore lint/performance/noBarrelFile: re-exporting
var client_2 = require("./generated/client");
Object.defineProperty(exports, "Prisma", {
  enumerable: true,
  get() {
    return client_2.Prisma;
  },
});
__exportStar(require("./src/critical-path"), exports);
__exportStar(require("./tenant"), exports);
