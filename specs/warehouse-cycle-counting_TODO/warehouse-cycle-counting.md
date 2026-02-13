# Cycle Counting and Audits

## Outcome
The system supports scheduling and executing physical inventory counts with variance tracking and adjustment workflows. Cycle counts maintain inventory accuracy by identifying and correcting discrepancies.

## In Scope
- Schedule cycle counts for specific inventory items or locations
- Execute counts with quantity entry and verification
- Compare counted quantities to system quantities (variance calculation)
- Create adjustment records for variances with reason codes
- Update inventory stock levels based on count results
- Generate count reports and variance analysis

## Out of Scope
- Automatic count scheduling based on rules
- Integration with barcode scanners for counting
- Count approval workflows
- Historical count analysis or reporting

## Invariants / Must Never Happen
- Count adjustments must never be applied without variance calculation
- Count records must never be deleted if adjustments were already applied
- Counts must never be completed without quantity entry
- Variance calculations must never be incorrect
- Count adjustments must never modify inventory without proper authorization
- Cycle counts must never include items from other locations or tenants

## Acceptance Checks
- Schedule cycle count → count appears in count schedule
- Execute count → enter counted quantities, system calculates variance
- Create adjustment for variance → inventory updated, adjustment recorded
- View count report → shows counted vs system quantities with variances
- Complete count → count marked complete, adjustments applied
- Attempt to delete count with adjustments → error shown, deletion prevented
