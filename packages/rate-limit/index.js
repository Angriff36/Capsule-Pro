Object.defineProperty(exports, "__esModule", { value: true });
exports.slidingWindow = exports.createRateLimiter = exports.redis = void 0;
const ratelimit_1 = require("@upstash/ratelimit");
const redis_1 = require("@upstash/redis");
const keys_1 = require("./keys");
exports.redis = new redis_1.Redis({
  url: (0, keys_1.keys)().UPSTASH_REDIS_REST_URL,
  token: (0, keys_1.keys)().UPSTASH_REDIS_REST_TOKEN,
});
const createRateLimiter = (props) =>
  new ratelimit_1.Ratelimit({
    redis: exports.redis,
    limiter: props.limiter ?? ratelimit_1.Ratelimit.slidingWindow(10, "10 s"),
    prefix: props.prefix ?? "next-forge",
  });
exports.createRateLimiter = createRateLimiter;
exports.slidingWindow = ratelimit_1.Ratelimit.slidingWindow;
