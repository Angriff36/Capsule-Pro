# Payroll Calculation Engine

## Outcome
The system calculates gross pay, overtime, deductions, and net pay based on timecards and employee rates. Calculations follow labor law requirements and generate payroll summaries ready for export.

## In Scope
- Calculate gross pay from timecard hours and employee pay rates
- Calculate overtime pay based on hours worked beyond threshold (e.g., 40 hours/week)
- Apply deductions (taxes, benefits, etc.) based on employee settings
- Calculate net pay (gross pay minus deductions)
- Generate payroll summaries per pay period
- Support different pay rates (regular, overtime, holiday, etc.)
- Handle multiple pay periods and employee types

## Out of Scope
- Tax filing or reporting to government agencies
- Direct deposit or payment processing
- Employee self-service payroll viewing
- Historical payroll analysis or reporting

## Invariants / Must Never Happen
- Overtime must never be calculated incorrectly; must follow applicable labor laws
- Net pay must never exceed gross pay
- Deductions must never be applied without employee authorization
- Payroll calculations must never use outdated pay rates
- Calculations must never be performed on unapproved timecards
- Payroll summaries must never include employees from other tenants

## Acceptance Checks
- Calculate payroll for employee with 45 hours → overtime calculated for 5 hours
- Calculate payroll with deductions → net pay equals gross minus deductions
- Generate payroll summary → includes all employees with correct totals
- Calculate payroll for multiple pay periods → each period calculated independently
- Calculate payroll with different pay rates → correct rate applied for each hour type
- Attempt to calculate payroll with unapproved timecards → error shown

## Implementation Notes
- Payroll record construction uses a builder (`PayrollRecordBuilder`) to avoid long positional argument lists.
- When adding new optional inputs, add a builder setter rather than expanding function signatures.
