// Capsule Pro — k6 Load Test Script
// ===================================
// Target: Top 10 API endpoints at 10x expected traffic (500 concurrent users)
// Baseline assumption: 50 concurrent users normal load
//
// AUTH: Requires a Clerk session token. Set via CLERK_SESSION_TOKEN env var.
//       1. Log in to Capsule Pro in browser
// 2. Open DevTools → Application → Cookies → copy __session value
// 3. export CLERK_SESSION_TOKEN=<token>
//
// Usage:
//   k6 run --vus 500 --duration 5m testing/load-test.js
//   k6 run --vus 50 --duration 2m testing/load-test.js  (baseline)
//   k6 run testing/load-test.js  (staged ramp — default)

import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ── Configuration ──────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:2221';
const SESSION_TOKEN = __ENV.CLERK_SESSION_TOKEN || '';

if (!SESSION_TOKEN) {
  fail('CLERK_SESSION_TOKEN env var is required. See header comments for instructions.');
}

const params = {
  headers: {
    'Content-Type': 'application/json',
    Cookie: `__session=${SESSION_TOKEN}`,
  },
  timeout: '30s',
};

// ── Custom Metrics ─────────────────────────────────────────────────────────

const errorRate = new Rate('errors');

// Per-endpoint latency trends
const eventListLatency = new Trend('latency_events_list');
const kitchenTasksLatency = new Trend('latency_kitchen_tasks');
const inventoryItemsLatency = new Trend('latency_inventory_items');
const crmClientsLatency = new Trend('latency_crm_clients');
const staffScheduleLatency = new Trend('latency_staff_schedule');
const calendarLatency = new Trend('latency_calendar');
const commandBoardLatency = new Trend('latency_command_board');
const analyticsFinanceLatency = new Trend('latency_analytics_finance');
const procurementPOLatency = new Trend('latency_procurement_po');
const searchLatency = new Trend('latency_search');

// ── Thresholds ─────────────────────────────────────────────────────────────

export const options = {
  stages: [
    // Stage 1: Baseline (50 VUs = normal traffic)
    { duration: '2m', target: 50 },
    // Stage 2: 3x (150 VUs)
    { duration: '2m', target: 150 },
    // Stage 3: 5x (250 VUs)
    { duration: '2m', target: 250 },
    // Stage 4: 10x (500 VUs = target load)
    { duration: '5m', target: 500 },
    // Stage 5: Spike to 15x (750 VUs — find breaking point)
    { duration: '3m', target: 750 },
    // Stage 6: Cool down
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    // Global error rate — must stay below 5%
    errors: ['rate<0.05'],
    // Global HTTP request duration
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    // Per-endpoint p95 must stay under 2s
    'latency_events_list': ['p(95)<2000'],
    'latency_kitchen_tasks': ['p(95)<2000'],
    'latency_inventory_items': ['p(95)<2000'],
    'latency_crm_clients': ['p(95)<2000'],
    'latency_staff_schedule': ['p(95)<2000'],
    'latency_calendar': ['p(95)<2000'],
    'latency_command_board': ['p(95)<2000'],
    'latency_analytics_finance': ['p(95)<3000'],
    'latency_procurement_po': ['p(95)<2000'],
    'latency_search': ['p(95)<2000'],
  },
};

// ── Test Data ──────────────────────────────────────────────────────────────

// Use realistic but static IDs. Replace with known-good IDs from your DB.
const TEST_EVENT_ID = __ENV.TEST_EVENT_ID || 'evt_test_001';
const TEST_BOARD_ID = __ENV.TEST_BOARD_ID || 'board_test_001';

// ── Endpoint Helpers ───────────────────────────────────────────────────────

function trackLatency(metric, res) {
  if (res && res.timings) {
    metric.add(res.timings.duration);
  }
}

// 1. Events list — highest traffic (events module: 141 routes)
function getEvents() {
  const res = http.get(`${BASE_URL}/api/events`, params);
  trackLatency(eventListLatency, res);
  const passed = check(res, {
    'events list status 200': (r) => r.status === 200,
    'events list has data': (r) => r.json() !== null,
  });
  errorRate.add(!passed);
  return res;
}

// 2. Kitchen tasks — kitchen module (259 routes, largest module)
function getKitchenTasks() {
  const res = http.get(`${BASE_URL}/api/kitchen/tasks`, params);
  trackLatency(kitchenTasksLatency, res);
  const passed = check(res, {
    'kitchen tasks status 200': (r) => r.status === 200,
  });
  errorRate.add(!passed);
  return res;
}

// 3. Inventory items list — inventory module (102 routes)
function getInventoryItems() {
  const res = http.get(`${BASE_URL}/api/inventory/items`, params);
  trackLatency(inventoryItemsLatency, res);
  const passed = check(res, {
    'inventory items status 200': (r) => r.status === 200,
  });
  errorRate.add(!passed);
  return res;
}

// 4. CRM clients list — CRM module (61 routes)
function getCrmClients() {
  const res = http.get(`${BASE_URL}/api/crm/clients`, params);
  trackLatency(crmClientsLatency, res);
  const passed = check(res, {
    'CRM clients status 200': (r) => r.status === 200,
  });
  errorRate.add(!passed);
  return res;
}

// 5. Staff schedule — staff module (50 routes)
function getStaffSchedule() {
  const res = http.get(`${BASE_URL}/api/staff/schedules`, params);
  trackLatency(staffScheduleLatency, res);
  const passed = check(res, {
    'staff schedule status 200': (r) => r.status === 200,
  });
  errorRate.add(!passed);
  return res;
}

// 6. Calendar — frequently polled for event dates
function getCalendar() {
  const res = http.get(`${BASE_URL}/api/calendar`, params);
  trackLatency(calendarLatency, res);
  const passed = check(res, {
    'calendar status 200': (r) => r.status === 200,
  });
  errorRate.add(!passed);
  return res;
}

// 7. Command board — real-time planning board
function getCommandBoard() {
  const res = http.get(`${BASE_URL}/api/command-board/boards/${TEST_BOARD_ID}`, params);
  trackLatency(commandBoardLatency, res);
  const passed = check(res, {
    'command board status 200': (r) => r.status === 200 || r.status === 404, // 404 acceptable if board doesn't exist
  });
  errorRate.add(!passed);
  return res;
}

// 8. Analytics finance — heavy aggregation query
function getAnalyticsFinance() {
  const res = http.get(`${BASE_URL}/api/analytics/finance`, params);
  trackLatency(analyticsFinanceLatency, res);
  const passed = check(res, {
    'analytics finance status 200': (r) => r.status === 200,
  });
  errorRate.add(!passed);
  return res;
}

// 9. Procurement purchase orders — write-heavy domain
function getProcurementPOs() {
  const res = http.get(`${BASE_URL}/api/procurement/purchase-orders`, params);
  trackLatency(procurementPOLatency, res);
  const passed = check(res, {
    'procurement POs status 200': (r) => r.status === 200,
  });
  errorRate.add(!passed);
  return res;
}

// 10. Search — global search endpoint
function getSearch() {
  const res = http.get(`${BASE_URL}/api/search?q=event`, params);
  trackLatency(searchLatency, res);
  const passed = check(res, {
    'search status 200': (r) => r.status === 200,
  });
  errorRate.add(!passed);
  return res;
}

// ── Main VU Loop ───────────────────────────────────────────────────────────

// Weighted execution reflecting real traffic patterns:
// - Read-heavy endpoints (events, kitchen, inventory) run more often
// - Write endpoints are proportionally lighter
const endpoints = [
  { fn: getEvents, weight: 20 },           // Most-viewed module
  { fn: getKitchenTasks, weight: 20 },     // Largest module by route count
  { fn: getInventoryItems, weight: 15 },   // High-frequency checks
  { fn: getCrmClients, weight: 10 },       // Regular CRM usage
  { fn: getStaffSchedule, weight: 10 },    // Shift management
  { fn: getCalendar, weight: 8 },          // Date polling
  { fn: getCommandBoard, weight: 5 },      // Planning board
  { fn: getAnalyticsFinance, weight: 4 },  // Heavy queries (less frequent)
  { fn: getProcurementPOs, weight: 4 },    // Procurement checks
  { fn: getSearch, weight: 4 },            // Occasional search
];

// Build weighted selector
const totalWeight = endpoints.reduce((sum, e) => sum + e.weight, 0);
function selectEndpoint() {
  let r = Math.random() * totalWeight;
  for (const ep of endpoints) {
    r -= ep.weight;
    if (r <= 0) return ep.fn;
  }
  return endpoints[0].fn;
}

export default function () {
  const endpoint = selectEndpoint();
  endpoint();
  // Simulate realistic think time between requests (1-3s)
  sleep(Math.random() * 2 + 1);
}

// ── Setup (optional: warm up with a single request) ────────────────────────

export function setup() {
  // Verify auth works before starting the load test
  const res = http.get(`${BASE_URL}/api/events`, params);
  if (res.status === 401) {
    fail('Authentication failed. Check CLERK_SESSION_TOKEN.');
  }
  console.log(`Auth check passed (status: ${res.status}). Starting load test.`);
}
