# Load Test Plan — cp-097

**Date:** 2026-04-13
**Status:** Script ready — awaiting execution
**Target:** Capsule Pro API at `localhost:2221`

---

## Objective

Establish a performance baseline for the Capsule Pro API under load. Identify the breaking point by ramping from normal traffic (50 VUs) to 15x (750 VUs). The primary goal is to find where latency degrades or error rates spike.

## Assumptions

- **Normal concurrent users:** 50
- **Target load (10x):** 500 concurrent VUs
- **Spike load (15x):** 750 concurrent VUs — to find the breaking point
- **Think time:** 1-3 seconds between requests per VU (realistic user behavior)
- **Test duration:** ~16 minutes total (staged ramp)

## Auth Setup

Capsule Pro uses Clerk for authentication. The k6 script requires a valid `__session` cookie:

1. Log in to Capsule Pro at `http://localhost:2221` in your browser
2. Open DevTools → Application → Cookies → copy the `__session` value
3. Export it: `export CLERK_SESSION_TOKEN=<token>`

The script validates the token during setup and fails fast if auth is invalid.

## Top 10 Endpoints Under Test

| # | Endpoint | Method | Weight | Module (route count) | Rationale |
|---|----------|--------|--------|---------------------|-----------|
| 1 | `/api/events` | GET | 20% | Events (141) | Highest-traffic domain |
| 2 | `/api/kitchen/tasks` | GET | 20% | Kitchen (259) | Largest module by route count |
| 3 | `/api/inventory/items` | GET | 15% | Inventory (102) | Frequent stock-level polling |
| 4 | `/api/crm/clients` | GET | 10% | CRM (61) | Regular CRM access |
| 5 | `/api/staff/schedules` | GET | 10% | Staff (50) | Shift management |
| 6 | `/api/calendar` | GET | 8% | Calendar (8) | Date polling |
| 7 | `/api/command-board/boards/:id` | GET | 5% | Command Board (39) | Planning board |
| 8 | `/api/analytics/finance` | GET | 4% | Analytics (5) | Heavy aggregation — expected slowest |
| 9 | `/api/procurement/purchase-orders` | GET | 4% | Procurement (37) | Procurement checks |
| 10 | `/api/search?q=event` | GET | 4% | Search (1) | Global search |

**Weights reflect estimated real traffic distribution** — read-heavy endpoints dominate.

## Load Stages

| Stage | Duration | Target VUs | Multiplier | Purpose |
|-------|----------|-----------|------------|---------|
| 1 | 2 min | 50 | 1x | Baseline — establish normal performance |
| 2 | 2 min | 150 | 3x | Moderate load |
| 3 | 2 min | 250 | 5x | Elevated load |
| 4 | 5 min | 500 | 10x | **Target load** — sustained stress |
| 5 | 3 min | 750 | 15x | Spike — find breaking point |
| 6 | 2 min | 0 | — | Cool down / recovery |

## Pass/Fail Criteria

| Metric | Threshold | Severity |
|--------|-----------|----------|
| Error rate | < 5% | FAIL if exceeded |
| p95 latency (global) | < 2000ms | FAIL if exceeded |
| p99 latency (global) | < 5000ms | FAIL if exceeded |
| p95 per-endpoint | < 2000ms (3000ms for analytics) | WARN if exceeded |
| Breaking point | Error rate > 10% or p95 > 10s | Record, don't fail |

## Metrics Collected

### Built-in k6 metrics
- `http_req_duration` — request latency (p50, p95, p99)
- `http_req_failed` — failed requests
- `vus` — active virtual users
- `iterations` — total iterations completed

### Custom per-endpoint metrics
- `latency_events_list`
- `latency_kitchen_tasks`
- `latency_inventory_items`
- `latency_crm_clients`
- `latency_staff_schedule`
- `latency_calendar`
- `latency_command_board`
- `latency_analytics_finance`
- `latency_procurement_po`
- `latency_search`
- `errors` — aggregate error rate

## Running the Test

```bash
# Ensure k6 is installed
# brew install k6  (macOS)  or  snap install k6  (Linux)  or  choco install k6  (Windows)

cd /home/oc/src/openclaw/projects/capsule-pro

# Set auth token
export CLERK_SESSION_TOKEN=<your_token>
export BASE_URL=http://localhost:2221

# Optional: set test entity IDs if you have real ones
export TEST_EVENT_ID=<real_event_id>
export TEST_BOARD_ID=<real_board_id>

# Run with default staged ramp (recommended)
k6 run testing/load-test.js

# Run baseline only (50 VUs, 2 min)
k6 run --vus 50 --duration 2m testing/load-test.js

# Run 10x only (500 VUs, 5 min)
k6 run --vus 500 --duration 5m testing/load-test.js

# Output results as JSON for analysis
k6 run --out json=testing/results.json testing/load-test.js

# Output to InfluxDB for Grafana dashboards
k6 run --out influxdb=http://localhost:8086/k6 testing/load-test.js
```

## Expected Results

Based on a Next.js App Router application with Prisma ORM and PostgreSQL:

| Load Level | Expected p50 | Expected p95 | Expected Error Rate |
|------------|-------------|-------------|-------------------|
| 50 VUs (1x) | 50-150ms | 200-500ms | < 0.1% |
| 150 VUs (3x) | 80-200ms | 300-800ms | < 1% |
| 250 VUs (5x) | 100-300ms | 500-1200ms | < 2% |
| 500 VUs (10x) | 150-500ms | 800-2000ms | < 5% |
| 750 VUs (15x) | ? | ? | ? (breaking point) |

## What to Look For

1. **Latency cliff** — the VU level where p95 jumps disproportionately
2. **Error spike** — the VU level where 5xx errors begin
3. **Slowest endpoints** — analytics/finance likely the bottleneck (heavy DB aggregation)
4. **Connection pool exhaustion** — Prisma default pool is `num_cpus * 2 + 1`; may need tuning
5. **Memory growth** — watch for GC pauses under sustained load

## Post-Test Actions

1. Record breaking point VU count and error pattern
2. If breaking point < 500 VUs: investigate DB queries, connection pooling, and middleware overhead
3. If breaking point > 500 VUs: document success and consider raising the target
4. Consider adding write-endpoint tests (POST mutations) in a separate destructive test run

## Files

- **Script:** `testing/load-test.js`
- **Plan:** `planning/load-test-plan.md` (this file)
