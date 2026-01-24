Object.defineProperty(exports, "__esModule", { value: true });
const instrumentation_client_1 = require("@repo/analytics/instrumentation-client");
const client_1 = require("@repo/observability/client");
(0, client_1.initializeSentry)();
(0, instrumentation_client_1.initializeAnalytics)();
