var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
const serverless_1 = require("@neondatabase/serverless");
const adapter_neon_1 = require("@prisma/adapter-neon");
const ws_1 = __importDefault(require("ws"));
const client_1 = require("./generated/client");
serverless_1.neonConfig.webSocketConstructor = ws_1.default;
const adapter = new adapter_neon_1.PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});
const database = new client_1.PrismaClient({ adapter });
async function getVersion() {
  const result = await database.$queryRaw`SELECT version();`;
  console.log(result);
  await database.$disconnect();
}
getVersion().catch(console.error);
