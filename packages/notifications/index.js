Object.defineProperty(exports, "__esModule", { value: true });
exports.notifications = void 0;
const node_1 = require("@knocklabs/node");
const keys_1 = require("./keys");
const key = (0, keys_1.keys)().KNOCK_SECRET_API_KEY;
exports.notifications = new node_1.Knock(key);
