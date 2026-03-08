const fs = require('fs');

// Read the compiled JS file
let content = fs.readFileSync('packages/manifest-runtime/packages/cli/dist/commands/audit-routes.js', 'utf-8');

// Find the auditRouteFileContent function and add a console.log at the beginning
content = content.replace(
  'export function auditRouteFileContent(content, file, options, ownershipContext)',
  'export function auditRouteFileContent(content, file, options, ownershipContext) {\n    console.error("DEBUG auditRouteFileContent called for:", file);'
);

// Remove the old function declaration line that's now duplicated
content = content.replace(
  'export function auditRouteFileContent(content, file, options, ownershipContext) {\n    console.error("DEBUG auditRouteFileContent called for:", file);\n  const findings',
  'export function auditRouteFileContent(content, file, options, ownershipContext) {\n    console.error("DEBUG auditRouteFileContent called for:", file);\n    const findings'
);

// Write back
fs.writeFileSync('packages/manifest-runtime/packages/cli/dist/commands/audit-routes.js', content);
console.log('Added debug at function start');
