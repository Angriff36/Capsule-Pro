#!/usr/bin/env node
/**
 * Fix money-as-number type mismatches in manifest command parameters.
 * Changes `paramName: number` → `paramName: money` inside command declarations.
 *
 * Usage: node manifest/scripts/fix-cmd-money-as-number.mjs [--dry-run]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = path.join(__dirname, "..", "source");
const dryRun = process.argv.includes("--dry-run");

// Financial field name stems
const FINANCIAL_STEMS = [
  "amount",
  "Amount",
  "cost",
  "Cost",
  "price",
  "Price",
  "value",
  "Value",
  "revenue",
  "Revenue",
  "budget",
  "Budget",
  "salary",
  "Salary",
  "wage",
  "Wage",
  "fee",
  "Fee",
  "deposit",
  "Deposit",
  "discount",
  "Discount",
  "subtotal",
  "Subtotal",
  "refund",
  "Refund",
  "gross",
  "Gross",
  "tips",
  "Tips",
  "spend",
  "Spend",
  "recognized",
  "Recognized",
  "remaining",
  "Remaining",
  "allocated",
  "Allocated",
  "variance",
  "Variance",
  "adjustment",
  "Adjustment",
  "outstanding",
  "Outstanding",
  "charge",
  "Charge",
  "totalGross",
  "totalNet",
  "totalBudget",
  "totalActual",
  "budgeted",
  "Budgeted",
  "estimatedValue",
  "estimatedTotal",
  "writeOff",
  "promiseAmount",
  "totalAmount",
  "totalValue",
  "totalCost",
  "unitCost",
  "unitPrice",
  "totalPrice",
  "basePrice",
  "baseUnitCost",
  "priceOverride",
  "totalTips",
  "costPerUnit",
  "costPerYield",
  "newSpentAmount",
  "finalSpentAmount",
  "newAmount",
  "newInstallmentAmount",
  "oldBudget",
  "newBudget",
  "budgetedRevenue",
  "budgetedTotalCost",
  "actualRevenue",
  "actualTotalCost",
  "totalBudgeted",
  "totalEstimatedCost",
  "estimatedUnitCost",
  "estimatedTotalCost",
  "serviceChargeAmount",
  "taxAmount",
  "subtotalAmount",
  "depositAmount",
  "purchasePrice",
  "currentValue",
  "paymentAmount",
];

// Exclusions - NOT financial
const EXCLUDES = new Set([
  "totalItems",
  "totalGuests",
  "totalCount",
  "totalQuantity",
  "totalLines",
  "totalRecords",
  "totalPages",
  "totalSteps",
  "totalTasks",
  "totalOrders",
  "totalShipments",
  "totalPallets",
  "totalCases",
  "attemptsRemaining",
  "guestCount",
  "itemCount",
  "hoursWorked",
  "hoursPerWeek",
  "overtimeHours",
  "quantityOrdered",
  "quantityReceived",
  "quantityOnHand",
  "quantity",
  "installmentCount",
  "paymentCount",
  "marginPercent",
  "percentage",
  "percentUsed",
  "percentVariance",
  "variancePercentage",
  "variancePct",
  "actualPct",
  "discountPercent",
  "completionPct",
  "progressPct",
  "dayOfWeek",
  "thresholdPct",
  "estimatedGuests",
  "squareFeet",
  "squareMeters",
  "temperatureValue",
  "temperature",
  "daysRemaining",
  "lastCostUpdate",
  "nextCostUpdate",
]);

// Fields that are quantities, NOT money
const QUANTITY_FIELDS = new Set([
  "actualUsage",
  "usageQuantity",
  "consumedQuantity",
  "producedQuantity",
  "quantity",
  "parLevel",
  "reorder_level",
  "minGuests",
  "maxGuests",
  "guestCount",
  "staffRequired",
  "estimatedGuests",
]);

function isFinancialField(fieldName) {
  if (EXCLUDES.has(fieldName)) {
    return false;
  }
  if (QUANTITY_FIELDS.has(fieldName)) {
    return false;
  }
  for (const stem of FINANCIAL_STEMS) {
    if (fieldName.includes(stem)) {
      return true;
    }
  }
  return false;
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const changes = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match command declarations with inline params: paramName: number
    // Pattern: inside command(...) or event(...) declarations
    if (!line.includes(": number")) {
      continue;
    }
    if (line.trimStart().startsWith("//") || line.trimStart().startsWith("#")) {
      continue;
    }

    // Replace all financial paramName: number occurrences on this line
    let newLine = line;
    const matches = line.matchAll(/(\w+):\s*number/g);
    let lineChanged = false;

    for (const match of matches) {
      const fieldName = match[1];
      if (isFinancialField(fieldName)) {
        const oldStr = `${fieldName}: number`;
        const newStr = `${fieldName}: money`;
        newLine = newLine.replace(oldStr, newStr);
        lineChanged = true;
        changes.push({ line: i + 1, field: fieldName });
      }
    }

    if (lineChanged && !dryRun) {
      lines[i] = newLine;
    }
  }

  if (changes.length > 0 && !dryRun) {
    fs.writeFileSync(filePath, lines.join("\n"), "utf8");
  }

  return changes;
}

// Process all .manifest source files
const files = fs
  .readdirSync(SOURCE_DIR)
  .filter((f) => f.endsWith(".manifest"))
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
console.log(
  `\n${dryRun ? "[DRY RUN] " : ""}Command-param money-as-number fix report`
);
console.log("=".repeat(60));
console.log(`Total changes: ${totalChanges}`);
console.log(`Files affected: ${Object.keys(fileChanges).length}`);
console.log("");

for (const [file, changes] of Object.entries(fileChanges)) {
  console.log(
    `${file} (${changes.length}): ${changes.map((c) => c.field).join(", ")}`
  );
}

if (dryRun) {
  console.log("\n[DRY RUN] No files were modified.");
}

console.log(
  `\nDone. ${totalChanges} fields changed across ${Object.keys(fileChanges).length} files.`
);
