#!/usr/bin/env node
/**
 * Adds `default policy` declarations inside entity blocks across all .manifest source files.
 *
 * WHY: Policies declared OUTSIDE entity blocks are not bound to commands in the compiled IR.
 * The `default policy` syntax inside entity blocks causes the compiler to auto-expand the
 * policy to every command in that entity, closing the 180/189 RBAC gap.
 *
 * USAGE: node manifest/scripts/add-default-policies.mjs [--dry-run]
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const SOURCE_DIR = './manifest/source';
const DRY_RUN = process.argv.includes('--dry-run');

// Validated domain → default policy role expression
// Based on analysis of existing 250 top-level policies across 67 manifest files
const DOMAIN_POLICIES = {
  // Events domain - event coordinators, catering/event managers, staff for import
  'event': { roles: '["staff", "event_coordinator", "catering_manager", "event_manager", "manager", "admin"]', desc: 'Event and event-related entity management' },
  'catering': { roles: '["event_coordinator", "catering_manager", "manager", "admin"]', desc: 'Catering order management' },
  'ai-event': { roles: '["staff", "event_coordinator", "manager", "admin"]', desc: 'AI event setup' },

  // Kitchen domain - all kitchen roles + staff for task viewing
  'dish': { roles: '["staff", "kitchen_staff", "kitchen_lead", "manager", "admin"]', desc: 'Kitchen dish management' },
  'recipe': { roles: '["staff", "kitchen_staff", "kitchen_lead", "manager", "admin"]', desc: 'Recipe management' },
  'allergen': { roles: '["staff", "kitchen_staff", "kitchen_lead", "manager", "admin"]', desc: 'Allergen warning management' },
  'prep-method': { roles: '["staff", "kitchen_staff", "kitchen_lead", "manager", "admin"]', desc: 'Prep method management' },
  'prep-task': { roles: '["staff", "kitchen_staff", "kitchen_lead", "manager", "admin"]', desc: 'Prep task management' },
  'prep-list': { roles: '["staff", "kitchen_staff", "kitchen_lead", "manager", "admin"]', desc: 'Prep list management' },
  'prep-comment': { roles: '["staff", "kitchen_staff", "kitchen_lead", "manager", "admin"]', desc: 'Prep comment management' },
  'kitchen-task': { roles: '["staff", "kitchen_staff", "kitchen_lead", "manager", "admin"]', desc: 'Kitchen task management' },
  'kitchen-extended': { roles: '["staff", "kitchen_staff", "kitchen_lead", "manager", "admin"]', desc: 'Kitchen extended entities' },
  'menu': { roles: '["staff", "kitchen_staff", "kitchen_lead", "manager", "admin"]', desc: 'Menu management' },
  'qa': { roles: '["staff", "kitchen_staff", "kitchen_lead", "manager", "admin"]', desc: 'Quality assurance' },

  // Inventory domain - kitchen staff for receiving + inventory managers
  'inventory': { roles: '["kitchen_staff", "kitchen_lead", "inventory_manager", "manager", "admin"]', desc: 'Inventory management' },
  'ingredient': { roles: '["kitchen_staff", "kitchen_lead", "inventory_manager", "manager", "admin"]', desc: 'Ingredient management' },
  'waste': { roles: '["kitchen_staff", "kitchen_lead", "inventory_manager", "manager", "admin"]', desc: 'Waste tracking' },
  'cycle-count': { roles: '["kitchen_staff", "kitchen_lead", "inventory_manager", "manager", "admin"]', desc: 'Cycle count management' },
  'container': { roles: '["kitchen_staff", "kitchen_lead", "inventory_manager", "manager", "admin"]', desc: 'Container management' },
  'station': { roles: '["kitchen_staff", "kitchen_lead", "inventory_manager", "manager", "admin"]', desc: 'Station management' },
  'bulk-order': { roles: '["kitchen_staff", "kitchen_lead", "inventory_manager", "manager", "admin"]', desc: 'Bulk order management' },

  // CRM/Sales domain
  'client': { roles: '["sales", "sales_rep", "sales_manager", "manager", "admin"]', desc: 'Client management' },
  'client-interaction': { roles: '["sales", "sales_rep", "sales_manager", "manager", "admin"]', desc: 'Client interaction tracking' },
  'lead': { roles: '["sales", "sales_rep", "sales_manager", "manager", "admin"]', desc: 'Lead management' },
  'deal': { roles: '["sales", "sales_rep", "sales_manager", "manager", "admin"]', desc: 'Deal management' },
  'proposal': { roles: '["sales", "sales_rep", "sales_manager", "manager", "admin"]', desc: 'Proposal management' },
  'crm-admin': { roles: '["sales", "sales_rep", "sales_manager", "manager", "admin"]', desc: 'CRM admin' },

  // Finance domain
  'invoice': { roles: '["finance", "finance_manager", "manager", "admin"]', desc: 'Invoice management' },
  'payment': { roles: '["finance", "finance_manager", "manager", "admin"]', desc: 'Payment processing' },
  'payment-method': { roles: '["finance", "finance_manager", "manager", "admin"]', desc: 'Payment method management' },
  'collection': { roles: '["finance", "finance_manager", "manager", "admin"]', desc: 'Collections management' },
  'revenue': { roles: '["finance", "finance_manager", "manager", "admin"]', desc: 'Revenue recognition' },
  'budget': { roles: '["finance", "finance_manager", "manager", "admin"]', desc: 'Budget management' },
  'labor-budget': { roles: '["finance", "finance_manager", "manager", "admin"]', desc: 'Labor budget management' },
  'chart-of-account': { roles: '["finance", "finance_manager", "manager", "admin"]', desc: 'Chart of accounts' },
  'bank-account': { roles: '["finance", "finance_manager", "manager", "admin"]', desc: 'Bank account management' },
  'pricing-tier': { roles: '["finance", "finance_manager", "manager", "admin"]', desc: 'Pricing tier management' },

  // Staff/HR domain
  'employee-availability': { roles: '["hr_admin", "payroll_admin", "manager", "admin"]', desc: 'Employee availability' },
  'employee-certification': { roles: '["hr_admin", "payroll_admin", "manager", "admin"]', desc: 'Employee certifications' },
  'payroll': { roles: '["hr_admin", "payroll_admin", "manager", "admin"]', desc: 'Payroll management' },
  'time-entry': { roles: '["hr_admin", "payroll_admin", "manager", "admin"]', desc: 'Time entry management' },
  'time-off': { roles: '["hr_admin", "payroll_admin", "manager", "admin"]', desc: 'Time off requests' },
  'staff-member': { roles: '["hr_admin", "payroll_admin", "manager", "admin"]', desc: 'Staff member management' },
  'staff-performance': { roles: '["hr_admin", "payroll_admin", "manager", "admin"]', desc: 'Staff performance' },
  'staff-logistics': { roles: '["hr_admin", "payroll_admin", "manager", "admin"]', desc: 'Staff logistics' },
  'training-assignment': { roles: '["hr_admin", "payroll_admin", "manager", "admin"]', desc: 'Training assignments' },
  'training-module': { roles: '["hr_admin", "payroll_admin", "manager", "admin"]', desc: 'Training modules' },

  // Procurement domain
  'vendor': { roles: '["procurement_manager", "manager", "admin"]', desc: 'Vendor management' },
  'vendor-catalog': { roles: '["procurement_manager", "manager", "admin"]', desc: 'Vendor catalog' },
  'vendor-contract': { roles: '["procurement_manager", "manager", "admin"]', desc: 'Vendor contract management' },
  'purchase-order': { roles: '["procurement_manager", "manager", "admin"]', desc: 'Purchase order management' },
  'procurement': { roles: '["procurement_manager", "manager", "admin"]', desc: 'Procurement management' },

  // Logistics domain
  'logistics': { roles: '["driver", "logistics_manager", "manager", "admin"]', desc: 'Logistics management' },
  'shipment': { roles: '["driver", "logistics_manager", "manager", "admin"]', desc: 'Shipment management' },

  // Workforce domain
  'schedule': { roles: '["manager", "admin"]', desc: 'Schedule management' },
  'workforce': { roles: '["manager", "admin"]', desc: 'Workforce AI' },

  // Notifications domain
  'notification': { roles: '["manager", "admin"]', desc: 'Notification management' },
  'email-template': { roles: '["manager", "admin"]', desc: 'Email template management' },
  'email-workflow': { roles: '["manager", "admin"]', desc: 'Email workflow management' },
  'sms-automation': { roles: '["manager", "admin"]', desc: 'SMS automation' },

  // Admin domain
  'role-policy': { roles: '["admin", "owner"]', desc: 'Role policy management' },
  'api-key': { roles: '["manager", "admin"]', desc: 'API key management' },
  'version-control': { roles: '["manager", "admin"]', desc: 'Version control' },
  'rate-limit': { roles: '["admin"]', desc: 'Rate limit configuration' },
  'override-audit': { roles: '["manager", "admin"]', desc: 'Override audit' },
  'sample-data': { roles: '["manager", "admin"]', desc: 'Sample data generation' },
  'admin-task': { roles: '["manager", "admin"]', desc: 'Admin task management' },
  'admin-chat': { roles: '["manager", "admin"]', desc: 'Admin chat' },
  'workflow': { roles: '["manager", "admin"]', desc: 'Workflow management' },
  'alerts-config': { roles: '["manager", "admin"]', desc: 'Alerts configuration' },

  // Facilities domain
  'facilit': { roles: '["facility_manager", "facilities_manager", "manager", "admin"]', desc: 'Facilities management' },
  'equipment': { roles: '["facility_manager", "facilities_manager", "manager", "admin"]', desc: 'Equipment management' },
  'work-order': { roles: '["facility_manager", "facilities_manager", "manager", "admin"]', desc: 'Work order management' },

  // Operations domain
  'command-board': { roles: '["kitchen_staff", "kitchen_lead", "event_coordinator", "manager", "admin"]', desc: 'Command board' },
  'battle-board': { roles: '["kitchen_staff", "kitchen_lead", "event_coordinator", "manager", "admin"]', desc: 'Battle board' },

  // Knowledge domain
  'knowledge': { roles: '["staff", "editor", "manager", "admin"]', desc: 'Knowledge base' },
  'document': { roles: '["staff", "editor", "manager", "admin"]', desc: 'Document versioning' },

  // User management
  'user': { roles: '["manager", "admin"]', desc: 'User management' },
};

// Fallback for unmapped files
const FALLBACK = { roles: '["manager", "admin"]', desc: 'Default management access' };

/**
 * Determine the policy roles for a given filename by matching against domain keys.
 */
function getPolicyForFile(filename) {
  // Strip suffix to get the key part
  const base = filename.replace('-rules.manifest', '').replace('-workflow.manifest', '').replace('.manifest', '');

  // Try exact match first
  if (DOMAIN_POLICIES[base]) return DOMAIN_POLICIES[base];

  // Try prefix match (longest match first for specificity)
  const keys = Object.keys(DOMAIN_POLICIES).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (base.startsWith(key) || base.includes(key)) return DOMAIN_POLICIES[key];
  }

  return FALLBACK;
}

/**
 * Process a single manifest file: add default policy inside each entity block.
 */
function processFile(filepath, filename) {
  let content = readFileSync(filepath, 'utf-8');

  // Skip files that already have default policy inside entity blocks
  // (like vendor-contract-rules.manifest which we already modified)
  if (content.includes('default policy ') && content.match(/entity\s+\w+\s*\{[^}]*default policy/s)) {
    console.log(`  SKIP (already has default policy): ${filename}`);
    return { skipped: true };
  }

  // Skip files with no entity blocks (like reactions.manifest)
  if (!content.includes('entity ')) {
    console.log(`  SKIP (no entities): ${filename}`);
    return { skipped: true };
  }

  const lines = content.split('\n');
  const result = [];
  let modified = false;
  let inEntity = false;
  let braceDepth = 0;
  let hasDefaultPolicy = false;
  let insertedInThisEntity = false;
  let currentEntityName = '';
  let currentPolicy = null;
  let currentPolicyLine = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track entity block boundaries
    const entityMatch = line.match(/^entity\s+(\w+)\s*\{/);
    if (entityMatch) {
      const entityName = entityMatch[1];
      inEntity = true;
      braceDepth = 1;
      hasDefaultPolicy = false;
      insertedInThisEntity = false;
      currentEntityName = entityName;
      // Get the domain-appropriate policy for this entity
      currentPolicy = getPolicyForFile(filename);
      currentPolicyLine = `  default policy ${entityName}DefaultAccess execute: user.role in ${currentPolicy.roles} "${currentPolicy.desc}"`;
      // Count additional opening braces on same line
      for (let c = 0; c < line.length; c++) {
        if (c !== line.indexOf('{') && line[c] === '{') braceDepth++;
      }
      result.push(line);
      continue;
    }

    if (inEntity) {
      // Track brace depth
      for (const ch of line) {
        if (ch === '{') braceDepth++;
        if (ch === '}') braceDepth--;
      }

      // Check if entity already has default policy
      if (trimmed.startsWith('default policy ')) {
        hasDefaultPolicy = true;
      }



      // Insert default policy before first command (if not already present and entity has commands)
      if (!hasDefaultPolicy && !insertedInThisEntity && trimmed.startsWith('command ')) {
        result.push(currentPolicyLine);
        modified = true;
        insertedInThisEntity = true;
      }

      result.push(line);

      // End of entity block
      if (braceDepth === 0) {
        // If entity has no commands, it might still need a policy for when commands are added
        // But for now, only add to entities with commands
        inEntity = false;
      }
      continue;
    }

    result.push(line);
  }

  if (modified) {
    if (!DRY_RUN) {
      writeFileSync(filepath, result.join('\n'), 'utf-8');
    }
    console.log(`  ${DRY_RUN ? 'WOULD MODIFY' : 'MODIFIED'}: ${filename}`);
    return { modified: true };
  }

  return { unchanged: true };
}

// Main
const files = readdirSync(SOURCE_DIR).filter(f => f.endsWith('.manifest')).sort();
console.log(`Processing ${files.length} manifest files...${DRY_RUN ? ' (DRY RUN)' : ''}`);

let stats = { modified: 0, skipped: 0, unchanged: 0 };
for (const file of files) {
  const filepath = join(SOURCE_DIR, file);
  const result = processFile(filepath, file);
  if (result.modified) stats.modified++;
  else if (result.skipped) stats.skipped++;
  else stats.unchanged++;
}

console.log(`\nResults: ${stats.modified} modified, ${stats.skipped} skipped, ${stats.unchanged} unchanged`);
