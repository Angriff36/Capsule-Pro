# QuickBooks Export

## Outcome
The system exports invoices, bills, and payroll summaries to QuickBooks in compatible format. This streamlines accounting workflows by eliminating manual data entry.

## In Scope
- Export invoices to QuickBooks format (customer, items, amounts, dates)
- Export bills/vendor invoices to QuickBooks format
- Export payroll summaries to QuickBooks format (employee, hours, pay, deductions)
- Support multiple export formats (CSV, IIF, or QuickBooks API)
- Map Convoy entities to QuickBooks accounts and items
- Generate export files ready for import into QuickBooks

## Out of Scope
- QuickBooks account setup or authentication
- Automatic import into QuickBooks (only export file generation)
- Custom field mapping UI
- Export scheduling or automation

## Invariants / Must Never Happen
- Export files must never include data from other tenants
- Export formats must never be invalid or incompatible with QuickBooks
- Financial data must never be exported without proper authorization
- Export mappings must never be incorrect (wrong accounts, items, etc.)
- Export operations must never fail silently; errors must be reported
- Exported data must never be modified after export file generation

## Acceptance Checks
- Export invoices → file generated in QuickBooks-compatible format
- Export payroll → file includes all employees with correct pay data
- Import export file into QuickBooks → data imports successfully
- View export history → shows all exports with dates and file names
- Export fails → error message shown with details
- Export with invalid mapping → validation error shown before export
