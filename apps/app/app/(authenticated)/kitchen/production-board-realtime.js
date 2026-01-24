"use client";

var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionBoardRealtime = ProductionBoardRealtime;
const ably_1 = __importDefault(require("ably"));
const navigation_1 = require("next/navigation");
const react_1 = require("react");
const getApiBaseUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    return apiUrl.replace(/\/$/, "");
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  return appUrl ? appUrl.replace(/\/$/, "") : "";
};
const isKitchenTaskEvent = (eventName) =>
  eventName?.startsWith("kitchen.task.") ?? false;
function ProductionBoardRealtime({ tenantId, userId }) {
  const router = (0, navigation_1.useRouter)();
  (0, react_1.useEffect)(() => {
    if (!tenantId) return;
    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl) {
      return;
    }
    const client = new ably_1.default.Realtime({
      authCallback: async (_, callback) => {
        try {
          const response = await fetch(`${apiBaseUrl}/ably/auth`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ tenantId }),
          });
          if (!response.ok) {
            throw new Error(`Ably auth failed: ${response.status}`);
          }
          const tokenRequest = await response.json();
          callback(null, tokenRequest);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Ably auth failed.";
          callback(message, null);
        }
      },
    });
    const channel = client.channels.get(`tenant:${tenantId}`);
    const handleMessage = (message) => {
      if (!isKitchenTaskEvent(message.name)) return;
      router.refresh();
    };
    channel.subscribe(handleMessage);
    return () => {
      channel.unsubscribe(handleMessage);
      // Note: We don't close the client here because:
      // 1. Multiple components may share the same connection
      // 2. The connection lifecycle should be managed at the app level
      // 3. Closing and recreating connections causes "Connection closed" errors
    };
  }, [tenantId, userId, router]);
  return null;
}
