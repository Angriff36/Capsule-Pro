# Event Budget Management

## Outcome
The system tracks event budgets with line items for food, labor, rentals, and miscellaneous costs. Users can see real-time actuals vs budget with variance reporting.

## In Scope
- Create budgets for events with line items (food, labor, rentals, miscellaneous)
- Track actual costs against budget line items
- Calculate variance (difference between budget and actuals)
- Show real-time budget status (under budget, on budget, over budget)
- Support multiple budget versions or revisions
- Allow budget editing before event execution

## Out of Scope
- Automatic budget generation from historical data
- Budget approval workflows
- Integration with accounting systems
- Budget forecasting or predictions

## Invariants / Must Never Happen
- Budget totals must never be negative
- Actual costs must never exceed reasonable limits without warning
- Budget variances must never be calculated incorrectly
- Budget line items must never be deleted if they have actual costs recorded
- Budgets must never be modified after event completion without proper permissions
- Budget calculations must never include costs from other events

## Acceptance Checks
- Create event budget → budget created with line items and totals
- Record actual costs → actuals tracked against budget line items
- View budget status → shows budget vs actuals with variance
- Update budget → changes reflected in calculations
- View budget over actuals → variance shown as positive (over budget)
- View budget under actuals → variance shown as negative (under budget)
