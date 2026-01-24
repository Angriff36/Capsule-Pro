Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSentry = void 0;
const initializeSentry = async () => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initializeSentry: initServer } = await import("./server");
    initServer();
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    const { initializeSentry: initEdge } = await import("./edge");
    initEdge();
  }
};
exports.initializeSentry = initializeSentry;
