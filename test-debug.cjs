#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Read the compiled JS file
let content = fs.readFileSync('packages/manifest-runtime/packages/cli/dist/commands/audit-routes.js', 'utf-8');

// Find the line with "const exempted = ownershipContext" and add debug after it
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const exempted = ownershipContext')) {
    // Insert debug line after the exempted line
    const indent = lines[i].match(/^\s*/)[0] || '';
    const debugLine = `${indent}if (normalizedFile.includes("user-preferences")) { console.error("DEBUG user-preferences:", normalizedFile, "method:", method, "exempted:", exempted); }`;
    lines.splice(i + 1, 0, debugLine);
    break;
  }
}

// Write back
fs.writeFileSync('packages/manifest-runtime/packages/cli/dist/commands/audit-routes.js', lines.join('\n'));
console.log('Added debug logging');
