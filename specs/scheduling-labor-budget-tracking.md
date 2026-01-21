# Labor Budget Tracking

## Outcome
The system tracks scheduled hours against labor budgets per event or time period. Real-time budget utilization is shown with alerts when approaching or exceeding limits.

## In Scope
- Set labor budgets for events or time periods (total hours or cost)
- Track scheduled hours/costs against budgets
- Calculate budget utilization percentage
- Show alerts when budget approaches limit (e.g., 80%, 90%, 100%)
- Support multiple budget types (per event, per week, per month)
- Allow budget adjustments and overrides

## Out of Scope
- Automatic budget generation from historical data
- Budget approval workflows
- Integration with payroll systems for actual cost tracking
- Budget forecasting or predictions

## Invariants / Must Never Happen
- Budget calculations must never be incorrect (scheduled hours vs budget)
- Budget alerts must never be suppressed or hidden
- Budgets must never be set to zero or negative
- Budget utilization must never exceed 100% without explicit override
- Budget tracking must never include hours from other tenants or events
- Budget updates must never be lost due to concurrent modifications

## Acceptance Checks
- Set labor budget for event → budget created and tracked
- Schedule shifts → budget utilization updates in real-time
- Approach budget limit → alert shown at configured threshold
- Exceed budget → warning shown, override required
- View budget dashboard → shows utilization across all budgets
- Adjust budget → changes reflected in calculations immediately
