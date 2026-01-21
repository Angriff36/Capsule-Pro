# Event Profitability Dashboard

## Outcome
The system provides comprehensive profitability analysis per event with revenue, COGS, labor costs, and margin calculations. This identifies most and least profitable event types to guide business decisions.

## In Scope
- Calculate event profitability: revenue minus COGS minus labor costs
- Show profitability breakdown by: event type, client, time period
- Display margin percentages and dollar amounts
- Identify most profitable event types and clients
- Identify least profitable events for improvement opportunities
- Support filtering and drill-down into event details

## Out of Scope
- Predictive profitability modeling
- Integration with accounting systems
- Profitability goal setting or tracking
- Historical profitability trend analysis

## Invariants / Must Never Happen
- Profitability calculations must never be incorrect (revenue - costs)
- Calculations must never include events from other tenants
- Margin calculations must never divide by zero
- Profitability data must never be based on incomplete cost data
- Dashboard updates must never be based on stale data
- Profitability calculations must never exclude required cost components

## Acceptance Checks
- View profitability dashboard → shows profitability by event type
- View event profitability → shows revenue, costs, and margin
- Filter by client → shows profitability for selected client
- View most profitable events → events sorted by profitability
- View least profitable events → events identified for improvement
- Update event costs → profitability recalculates automatically
