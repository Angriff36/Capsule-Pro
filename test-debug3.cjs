const fs = require('fs');

// Read the compiled JS file
let content = fs.readFileSync('packages/manifest-runtime/packages/cli/dist/commands/audit-routes.js', 'utf-8');

// Replace the condition with just always true for debugging
content = content.replace(
  /if \(normalizedFile\.includes\("user-preferences"\)\)/g,
  'if (true) // normalizedFile.includes("user-preferences")'
);

// Write back
fs.writeFileSync('packages/manifest-runtime/packages/cli/dist/commands/audit-routes.js', content);
console.log('Patched to always print debug');
