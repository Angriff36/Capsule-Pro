Object.defineProperty(exports, "__esModule", { value: true });
exports.log = void 0;
const next_1 = require("@logtail/next");
exports.log = process.env.NODE_ENV === "production" ? next_1.log : console;
