#!/usr/bin/env node
/**
 * Fix money-as-number type mismatches in manifest source files.
 * Changes `number` → `money` for financial field names in event payloads and command params.
 *
 * Usage: node manifest/scripts/fix-money-as-number.mjs [--dry-run]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = path.join(__dirname, '..', 'source');
const dryRun = process.argv.includes('--dry-run');

// Financial field name stems - if a field name contains any of these, it's financial
const FINANCIAL_STEMS = [
  'amount', 'Amount',
  'cost', 'Cost',
  'price', 'Price',
  'value', 'Value',
  'revenue', 'Revenue',
  'budget', 'Budget',
  'salary', 'Salary',
  'wage', 'Wage',
  'fee', 'Fee',
  'deposit', 'Deposit',
  'discount', 'Discount',
  'subtotal', 'Subtotal',
  'refund', 'Refund',
  'gross', 'Gross',
  'tips', 'Tips',
  'spend', 'Spend',
  'recognized', 'Recognized',
  'remaining', 'Remaining',
  'allocated', 'Allocated',
  'variance', 'Variance',
  'adjustment', 'Adjustment',
  'outstanding', 'Outstanding',
  'charge', 'Charge',
  'totalGross', 'totalNet',
  'totalBudget', 'totalActual',
  'budgeted', 'Budgeted',
  'actual', 'Actual',
  'estimatedValue', 'estimatedTotal',
  'writeOff',
  'promiseAmount',
  'totalAmount',
  'totalValue',
  'totalCost',
  'unitCost',
  'unitPrice',
  'totalPrice',
  'basePrice',
  'baseUnitCost',
  'priceOverride',
  'totalTips',
  'costPerUnit',
  'costPerYield',
  'newSpentAmount',
  'finalSpentAmount',
  'newAmount',
  'newInstallmentAmount',
  'oldBudget',
  'newBudget',
  'budgetedRevenue',
  'budgetedTotalCost',
  'actualRevenue',
  'actualTotalCost',
  'totalBudgeted',
  'totalEstimatedCost',
  'estimatedUnitCost',
  'estimatedTotalCost',
  'serviceChargeAmount',
  'taxAmount',
  'subtotalAmount',
  'depositAmount',
];

// Exclusion patterns - fields that look financial but are NOT currency
const EXCLUDES = new Set([
  // Counts/quantities
  'totalItems', 'totalGuests', 'totalCount', 'totalQuantity', 'totalLines',
  'totalRecords', 'totalPages', 'totalSteps', 'totalTasks', 'totalOrders',
  'totalShipments', 'totalPallets', 'totalCases',
  'attemptsRemaining',
  'guestCount', 'itemCount',
  'hoursWorked', 'hoursPerWeek', 'overtimeHours',
  'quantityOrdered', 'quantityReceived', 'quantityOnHand',
  'installmentCount', 'paymentCount',
  // Percentages (decimal, not money)
  'marginPercent', 'percentage', 'percentUsed', 'percentVariance',
  'variancePercentage', 'variancePct', 'actualPct', 'discountPercent',
  'completionPct', 'progressPct',
  // Time/date
  'dayOfWeek',
]);

// Fields that are quantities/usage, NOT money
const QUANTITY_FIELDS = new Set([
  'actualUsage', 'usageQuantity', 'consumedQuantity', 'producedQuantity',
]);

function isFinancialField(fieldName) {
  if (EXCLUDES.has(fieldName)) return false;
  if (QUANTITY_FIELDS.has(fieldName)) return false;
  for (const stem of FINANCIAL_STEMS) {
    if (fieldName.includes(stem)) return true;
  }
  return false;
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const changes = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match: indented `fieldName: number` (with optional trailing whitespace/comma)
    // This catches event payload fields and command params
    const match = line.match(/^(\s+)([a-zA-Z_][a-zA-Z0-9_]*):\s*number(\s*)$/);
    if (match) {
      const [, indent, fieldName, trailing] = match;
      if (isFinancialField(fieldName)) {
        const newLine = `${indent}${fieldName}: money${trailing}`;
        if (newLine !== line) {
          changes.push({ line: i + 1, old: line, new: newLine, field: fieldName });
          if (!dryRun) {
            lines[i] = newLine;
          }
        }
      }
    }
  }

  if (changes.length > 0 && !dryRun) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  }

  return changes;
}

// Process all .manifest source files
const files = fs.readdirSync(SOURCE_DIR)
  .filter(f => f.endsWith('.manifest'))
  .sort();

let totalChanges = 0;
const fileChanges = {};

for (const file of files) {
  const filePath = path.join(SOURCE_DIR, file);
  const changes = processFile(filePath);
  if (changes.length > 0) {
    fileChanges[file] = changes;
    totalChanges += changes.length;
  }
}

// Report
console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Money-as-number fix report`);
console.log('='.repeat(60));
console.log(`Total changes: ${totalChanges}`);
console.log(`Files affected: ${Object.keys(fileChanges).length}`);
console.log('');

for (const [file, changes] of Object.entries(fileChanges)) {
  console.log(`\n${file} (${changes.length} changes):`);
  for (const c of changes) {
    console.log(`  L${c.line}: ${c.field}: number → money`);
  }
}

if (dryRun) {
  console.log('\n[DRY RUN] No files were modified.');
}

console.log(`\nDone. ${totalChanges} fields changed across ${Object.keys(fileChanges).length} files.`);
