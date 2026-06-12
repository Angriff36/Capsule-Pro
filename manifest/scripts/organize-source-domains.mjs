#!/usr/bin/env node
/**
 * Move flat manifest/source/*.manifest into domain subdirs for module graph clarity.
 * Idempotent: skips files already under a domain folder.
 */
import { mkdirSync, readdirSync, renameSync } from "node:fs";
import { basename, join } from "node:path";
import { getConfigPaths } from "./read-config.mjs";

const { srcDir: SOURCE_DIR } = getConfigPaths();

const DOMAIN_BY_PREFIX = [
  ["event-", "events"],
  ["events-", "events"],
  ["battle-board", "events"],
  ["command-board", "events"],
  ["catering-order", "events"],
  ["kitchen-", "kitchen"],
  ["prep-", "kitchen"],
  ["station-", "kitchen"],
  ["recipe-", "kitchen"],
  ["dish-", "kitchen"],
  ["menu-", "kitchen"],
  ["ingredient-", "kitchen"],
  ["inventory-", "inventory"],
  ["cycle-count", "inventory"],
  ["bulk-order", "inventory"],
  ["vendor-", "procurement"],
  ["purchase-order", "procurement"],
  ["procurement-", "procurement"],
  ["payroll-", "staff"],
  ["time-", "staff"],
  ["staff-", "staff"],
  ["schedule-", "staff"],
  ["labor-", "staff"],
  ["training-", "staff"],
  ["workflow-", "platform"],
  ["reaction", "platform"],
  ["role-policy", "platform"],
  ["api-key", "platform"],
  ["user-", "platform"],
  ["notification-", "platform"],
  ["override-audit", "platform"],
  ["rate-limit", "platform"],
  ["sample-data", "platform"],
  ["client-", "crm"],
  ["lead-", "crm"],
  ["deal-", "crm"],
  ["proposal-", "crm"],
  ["invoice-", "finance"],
  ["payment-", "finance"],
  ["budget-", "finance"],
  ["collections-", "finance"],
  ["revenue-", "finance"],
  ["pricing-", "finance"],
  ["accounting-", "finance"],
  ["facilities-", "operations"],
  ["equipment-", "operations"],
  ["logistics-", "operations"],
  ["shipment-", "operations"],
  ["work-order", "operations"],
  ["workforce-", "operations"],
  ["qa-", "quality"],
  ["waste-", "quality"],
  ["ai-event", "ai"],
  ["knowledge-base", "ai"],
  ["sms-automation", "integrations"],
  ["version-control", "integrations"],
];

function resolveDomain(filename) {
  const lower = filename.toLowerCase();
  for (const [prefix, domain] of DOMAIN_BY_PREFIX) {
    if (lower.startsWith(prefix)) {
      return domain;
    }
  }
  return "core";
}

function listFlatManifests(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".manifest"))
    .map((e) => join(dir, e.name));
}

let moved = 0;
for (const filePath of listFlatManifests(SOURCE_DIR)) {
  const name = basename(filePath);
  const domain = resolveDomain(name);
  const targetDir = join(SOURCE_DIR, domain);
  mkdirSync(targetDir, { recursive: true });
  const targetPath = join(targetDir, name);
  if (filePath === targetPath) {
    continue;
  }
  renameSync(filePath, targetPath);
  moved++;
  console.log(`[organize-source] ${name} -> ${domain}/`);
}

console.log(`[organize-source] moved ${moved} file(s)`);
